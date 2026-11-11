import type { IFunctionalAstrolabe } from "iztro/lib/astro/FunctionalAstrolabe";
import { leapMonthOf, lunarMonthDays } from "@/lib/lunar";

export type Astrolabe = IFunctionalAstrolabe;

export type Gender = "男" | "女";
export type CalendarType = "solar" | "lunar";

export type BirthInput = {
  name: string;
  gender: Gender;
  calendar: CalendarType;
  year: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
  timeIndex: number;
};

/** iztro 的時辰索引：0 早子時 … 11 亥時，12 晚子時 */
export const TIME_SLOTS = [
  { index: 0, label: "早子時", range: "00:00–00:59" },
  { index: 1, label: "丑時", range: "01:00–02:59" },
  { index: 2, label: "寅時", range: "03:00–04:59" },
  { index: 3, label: "卯時", range: "05:00–06:59" },
  { index: 4, label: "辰時", range: "07:00–08:59" },
  { index: 5, label: "巳時", range: "09:00–10:59" },
  { index: 6, label: "午時", range: "11:00–12:59" },
  { index: 7, label: "未時", range: "13:00–14:59" },
  { index: 8, label: "申時", range: "15:00–16:59" },
  { index: 9, label: "酉時", range: "17:00–18:59" },
  { index: 10, label: "戌時", range: "19:00–20:59" },
  { index: 11, label: "亥時", range: "21:00–22:59" },
  { index: 12, label: "晚子時", range: "23:00–23:59" },
] as const;

export const LUNAR_MONTHS = ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "臘"];

export const LUNAR_DAYS = [
  "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
  "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十",
];

export const MIN_YEAR = 1900;
export const MAX_YEAR = 2100;

export function daysInMonth(input: Pick<BirthInput, "calendar" | "year" | "month" | "isLeapMonth">) {
  if (input.calendar === "lunar") {
    const leap = input.isLeapMonth && leapMonthOf(input.year) === input.month;
    return lunarMonthDays(input.year, input.month, leap);
  }
  return new Date(input.year, input.month, 0).getDate();
}

export type { SolarParts } from "@/lib/lunar";
/**
 * 農曆換算改用自帶的閏月大小月表（lunar.ts）。不直接用 lunar-lite：它的 lunar2solar 換算閏月時
 * 會先拿同名的本月檢查日數，閏月三十天、本月只有二十九天時（例如 1955 閏三月、2017 閏六月）會誤判；
 * 而且整套函式庫（含節日資料）會讓首頁多載入約 100 KB。
 */
export { leapMonthOf, lunarMonthDays, lunarToSolar } from "@/lib/lunar";

/** 由出生時間（時、分）換算時辰索引 */
export function timeIndexFromClock(hour: number) {
  if (hour === 0) return 0;
  if (hour === 23) return 12;
  return Math.floor((hour + 1) / 2);
}

/**
 * 排盤。日期與時辰須先經 resolveBirth 校正（夏令時間、真太陽時、晚子時換日），
 * 這裡一律以國曆送進 iztro。iztro 在呼叫時才動態載入，讓首頁不必一開始就下載排盤程式。
 */
export async function computeAstrolabe(birth: { dateStr: string; timeIndex: number }, gender: Gender): Promise<Astrolabe> {
  let astro: typeof import("iztro").astro;
  try {
    ({ astro } = await import("iztro"));
  } catch {
    throw new EngineLoadError();
  }
  return astro.withOptions({
    type: "solar",
    dateStr: birth.dateStr,
    timeIndex: birth.timeIndex,
    gender,
    fixLeap: true,
    language: "zh-TW",
    config: CHART_CONFIG,
  });
}

/** 排盤程式下載失敗（多半是網路中斷），和生辰資料錯誤分開提示 */
export class EngineLoadError extends Error {
  constructor() {
    super("排盤程式載入失敗");
    this.name = "EngineLoadError";
  }
}

/**
 * 採用目前最通行的排法，明確寫出以免套件預設值變動時排盤跟著改變：
 * 通行版安星與四化、正月初一換年、小限以年分界。晚子時已在 resolveBirth 換成隔日子時。
 * 閏月以十五日為界：十五日以前算本月，十六日以後算下月（fixLeap）。
 */
const CHART_CONFIG = {
  algorithm: "default",
  yearDivide: "normal",
  horoscopeDivide: "normal",
  ageDivide: "normal",
  dayDivide: "forward",
} as const;

/**
 * 宮位索引（0 = 寅宮，依地支順行）對應到 4×4 命盤格線的位置。
 *
 *   巳 午 未 申
 *   辰  中宮  酉
 *   卯  中宮  戌
 *   寅 丑 子 亥
 */
export const GRID_POSITION: Record<number, { row: number; col: number }> = {
  3: { row: 0, col: 0 }, 4: { row: 0, col: 1 }, 5: { row: 0, col: 2 }, 6: { row: 0, col: 3 },
  2: { row: 1, col: 0 }, 7: { row: 1, col: 3 },
  1: { row: 2, col: 0 }, 8: { row: 2, col: 3 },
  0: { row: 3, col: 0 }, 11: { row: 3, col: 1 }, 10: { row: 3, col: 2 }, 9: { row: 3, col: 3 },
};

/** 三方四正：本宮、對宮，以及相隔四宮的兩個三合宮 */
export function surroundedIndexes(index: number) {
  return {
    target: index,
    opposite: (index + 6) % 12,
    trineA: (index + 4) % 12,
    trineB: (index + 8) % 12,
  };
}

/**
 * 宮名的顯示用字。iztro 與程式內部沿用古籍的「僕役」，畫面上改用台灣現今通用的「交友」；
 * 判斷宮位時仍一律比對 iztro 的原名。
 */
export function palaceName(name: string) {
  return name === "僕役" ? "交友" : name;
}

export function palaceTitle(name: string) {
  const shown = palaceName(name);
  return shown.endsWith("宮") ? shown : `${shown}宮`;
}

/** 生年四化實心標籤。字色用 surface：淺色模式為白字、深色模式為深字，兩者對比皆 ≥ 4.5 */
export const MUTAGEN_STYLE: Record<string, string> = {
  祿: "bg-lu text-surface",
  權: "bg-quan text-surface",
  科: "bg-ke text-surface",
  忌: "bg-ji text-surface",
};

/** 所選運限的四化，以外框呈現，與生年四化的實心區隔 */
export const MUTAGEN_OUTLINE: Record<string, string> = {
  祿: "border-lu text-lu",
  權: "border-quan text-quan",
  科: "border-ke text-ke",
  忌: "border-ji text-ji",
};

export const PALACE_SHORT: Record<string, string> = {
  命宮: "命", 兄弟: "兄", 夫妻: "夫", 子女: "子", 財帛: "財", 疾厄: "疾",
  遷移: "遷", 僕役: "友", 官祿: "官", 田宅: "田", 福德: "福", 父母: "父",
};

/** 民國紀年，例如 1992 →「民國81」、1905 →「民前7」 */
export function rocYear(year: number) {
  return year >= 1912 ? `民國${year - 1911}` : `民前${1912 - year}`;
}

export function formatBirthSummary(input: BirthInput) {
  const slot = TIME_SLOTS[input.timeIndex];
  if (input.calendar === "lunar") {
    return `農曆 ${input.year} 年${input.isLeapMonth ? "閏" : ""}${LUNAR_MONTHS[input.month - 1]}月${LUNAR_DAYS[input.day - 1]} ${slot.label}`;
  }
  return `國曆 ${input.year} 年 ${input.month} 月 ${input.day} 日 ${slot.label}`;
}

/** iztro 的 zh-TW 農曆字串仍會夾帶簡體字（闰、腊），顯示前轉成繁體 */
export function toTraditionalLunar(text: string) {
  return text.replace(/闰/g, "閏").replace(/腊/g, "臘");
}
