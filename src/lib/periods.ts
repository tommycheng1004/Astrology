import type { IFunctionalHoroscope } from "iztro/lib/astro/FunctionalHoroscope";
import { solarStringToLunar } from "@/lib/lunar";
import { LUNAR_DAYS, LUNAR_MONTHS, lunarToSolar, TIME_SLOTS, timeIndexFromClock, type Astrolabe, type SolarParts } from "@/lib/ziwei";

/**
 * 運限的時間選擇：流年（農曆年）→ 流月 → 流日 → 流時。
 * 紫微斗數最小單位是時辰，沒有流分、流秒。
 */

export type Level = "decadal" | "yearly" | "monthly" | "daily" | "hourly";
/** 目前在看哪一層：本命或某一層運限 */
export type Lens = "natal" | Level;
export const LEVELS: Level[] = ["decadal", "yearly", "monthly", "daily", "hourly"];
export const LEVEL_NAME: Record<Level, string> = {
  decadal: "大限",
  yearly: "流年",
  monthly: "流月",
  daily: "流日",
  hourly: "流時",
};

export const LAYER_PREFIX: Record<Level, string> = {
  decadal: "限",
  yearly: "年",
  monthly: "月",
  daily: "日",
  hourly: "時",
};

/** 某一層運限的四化：星名 → 祿權科忌 */
export function lensMutagens(horoscope: IFunctionalHoroscope | null, lens: Lens) {
  const map = new Map<string, string>();
  if (!horoscope || lens === "natal") return map;
  horoscope[lens].mutagen.forEach((star, i) => map.set(star, "祿權科忌"[i]));
  return map;
}

export type Selection = {
  /** 農曆年 */
  year: number;
  /** monthsOf(year) 的索引 */
  monthKey: number;
  /** 農曆日 */
  day: number;
  /** 時辰 0（子）…11（亥） */
  hour: number;
};

export type MonthEntry = {
  key: number;
  month: number;
  isLeap: boolean;
  dayRange: [number, number];
  label: string;
  /** 國曆起訖，短格式 4/17–5/16 */
  solarRange: string;
  /** 國曆起訖，含年份 2026/4/17 – 2026/5/16 */
  solarRangeFull: string;
};

export const YEAR_SPAN = 10;

/**
 * 十二時辰的國曆時間。子時依排盤設定從前一天 23:00 起算（晚子時算隔日），
 * 所以某一天的子時是「前一天 23:00 到當天 00:59」。
 */
export const HOURS = TIME_SLOTS.slice(0, 12).map((t) => ({
  index: t.index,
  label: t.label.replace("早", ""),
  range: t.index === 0 ? "23:00–00:59" : t.range,
}));

const WEEKDAYS = "日一二三四五六";

const md = (s: SolarParts) => `${s.solarMonth}/${s.solarDay}`;
const ymd = (s: SolarParts) => `${s.solarYear}/${s.solarMonth}/${s.solarDay}`;

/** 一個農曆年的流月。閏月依「十五日為界」拆成上、下半月，分屬本月與下月的流月宮 */
export function monthsOf(astrolabe: Astrolabe, year: number): MonthEntry[] {
  return astrolabe.monthlyList(year).map((m, key) => {
    const from = lunarToSolar(year, m.month, m.dayRange[0], m.isLeapMonth);
    const to = lunarToSolar(year, m.month, m.dayRange[1], m.isLeapMonth);
    return {
      key,
      month: m.month,
      isLeap: m.isLeapMonth,
      dayRange: m.dayRange,
      label: `${m.isLeapMonth ? "閏" : ""}${LUNAR_MONTHS[m.month - 1]}月${m.part === "first" ? "上" : m.part === "second" ? "下" : ""}`,
      solarRange: `${md(from)}–${md(to)}`,
      solarRangeFull: `${ymd(from)} – ${ymd(to)}`,
    };
  });
}

export function daysOf(year: number, entry: MonthEntry) {
  const days = [];
  for (let d = entry.dayRange[0]; d <= entry.dayRange[1]; d++) {
    const solar = lunarToSolar(year, entry.month, d, entry.isLeap);
    const weekday = WEEKDAYS[new Date(solar.solarYear, solar.solarMonth - 1, solar.solarDay).getDay()];
    days.push({
      day: d,
      label: LUNAR_DAYS[d - 1],
      solar: md(solar),
      solarFull: ymd(solar),
      weekday,
      date: solarString(solar),
    });
  }
  return days;
}

export function solarDateOf(year: number, entry: MonthEntry, day: number) {
  return solarString(lunarToSolar(year, entry.month, day, entry.isLeap));
}

/** 現在對應的運限選擇。晚子時（23:00 後）依排盤設定算隔日的子時 */
export function nowSelection(astrolabe: Astrolabe, now = new Date()) {
  let hour = timeIndexFromClock(now.getHours());
  const date = new Date(now);
  if (hour === 12) {
    date.setDate(date.getDate() + 1);
    hour = 0;
  }
  const lunar = solarStringToLunar(`${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`);
  const months = monthsOf(astrolabe, lunar.lunarYear);
  const entry =
    months.find(
      (m) =>
        m.month === lunar.lunarMonth &&
        m.isLeap === lunar.isLeap &&
        lunar.lunarDay >= m.dayRange[0] &&
        lunar.lunarDay <= m.dayRange[1],
    ) ?? months[0];
  return { year: lunar.lunarYear, monthKey: entry.key, day: lunar.lunarDay, hour };
}

/** 年份改變時盡量保留同一個月份、同一天 */
export function normalizeSelection(astrolabe: Astrolabe, sel: Selection, prevMonths?: MonthEntry[]): Selection {
  const months = monthsOf(astrolabe, sel.year);
  const prev = prevMonths?.[sel.monthKey];
  let entry = months[Math.min(sel.monthKey, months.length - 1)];
  if (prev) {
    // 閏月依十五日拆成上、下半月兩格，要找日子所在的那一半，否則閏月二十會被改成十五
    const same = months.filter((m) => m.month === prev.month && m.isLeap === prev.isLeap);
    // 日子超出範圍（例如閏月三十換到只有二十九天的年份）時，取最接近的那一半，日子再收到月底
    const gap = (m: MonthEntry) => Math.max(m.dayRange[0] - sel.day, sel.day - m.dayRange[1], 0);
    entry =
      same.find((m) => sel.day >= m.dayRange[0] && sel.day <= m.dayRange[1]) ??
      [...same].sort((x, y) => gap(x) - gap(y))[0] ??
      months.find((m) => m.month === prev.month && sel.day >= m.dayRange[0] && sel.day <= m.dayRange[1]) ??
      months.find((m) => m.month === prev.month) ??
      entry;
  }
  const day = Math.min(Math.max(sel.day, entry.dayRange[0]), entry.dayRange[1]);
  return { ...sel, monthKey: entry.key, day };
}

/** iztro 的小限只排到虛歲 120，之後小限宮位為 -1 */
export const MAX_AGE = 120;

const BRANCHES = "子丑寅卯辰巳午未申酉戌亥";

/** 日期＋時辰換成可比較的數字（每天 12 個時辰） */
function moment(date: string, hour: number) {
  const [y, m, d] = date.split("-").map(Number);
  return (Date.UTC(y, m - 1, d) / 86400000) * 12 + hour;
}

/** 出生的日期與時辰（排盤用的日期，晚子時已換成隔日子時） */
export function birthMoment(astrolabe: Astrolabe) {
  return { date: astrolabe.solarDate, hour: BRANCHES.indexOf(astrolabe.rawDates.chineseDate.hourly[1]) };
}

/**
 * 某一刻的運限；出生前或超過 120 歲（小限、大限排不到）回傳 null。
 * 不能只看虛歲：同一個農曆年裡出生前的日子虛歲也是 1。
 * until 是這個時段的最後一刻：時段開始在出生前、但涵蓋出生時刻（例如出生那一年的流年）時，改用出生時刻計算。
 */
export function horoscopeAt(
  astrolabe: Astrolabe,
  date: string,
  hour = 0,
  until?: { date: string; hour: number },
): IFunctionalHoroscope | null {
  const birth = birthMoment(astrolabe);
  const born = moment(birth.date, birth.hour);
  if (moment(date, hour) < born) {
    if (!until || moment(until.date, until.hour) < born) return null;
    date = birth.date;
    hour = birth.hour;
  }
  try {
    const h = astrolabe.horoscope(date, hour);
    return h.age.nominalAge >= 1 && h.age.nominalAge <= MAX_AGE && h.age.index >= 0 && h.decadal.index >= 0 ? h : null;
  } catch {
    return null;
  }
}

/** 農曆正月初一的國曆日期；超出曆表範圍（約 1900–2100）時回傳 null */
export function yearStartDate(year: number) {
  try {
    return solarString(lunarToSolar(year, 1, 1));
  } catch {
    return null;
  }
}

/** 農曆年最後一天（除夕）的國曆日期 YYYY-M-D */
export function yearEndDate(year: number) {
  try {
    const next = lunarToSolar(year + 1, 1, 1);
    const end = new Date(Date.UTC(next.solarYear, next.solarMonth - 1, next.solarDay - 1));
    return `${end.getUTCFullYear()}-${end.getUTCMonth() + 1}-${end.getUTCDate()}`;
  } catch {
    return null;
  }
}

/** 一個農曆年（或連續數年）對應的國曆起訖：正月初一到隔年除夕 */
export function yearSolarRange(year: number, span = 1) {
  try {
    const from = lunarToSolar(year, 1, 1);
    const next = lunarToSolar(year + span, 1, 1);
    const end = new Date(next.solarYear, next.solarMonth - 1, next.solarDay - 1);
    const to = { solarYear: end.getFullYear(), solarMonth: end.getMonth() + 1, solarDay: end.getDate() };
    return { from: ymd(from), to: ymd(to), fromShort: md(from) };
  } catch {
    return null;
  }
}

/** 某一天某時辰的國曆時間，子時會跨到前一天 */
export function hourSolarText(dateStr: string, hour: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const range = HOURS[hour].range;
  if (hour !== 0) return `${y}/${m}/${d} ${range}`;
  const prev = new Date(y, m - 1, d - 1);
  return `${prev.getFullYear()}/${prev.getMonth() + 1}/${prev.getDate()} 23:00 – ${m}/${d} 00:59`;
}

export function yearGanzhi(year: number) {
  return "甲乙丙丁戊己庚辛壬癸"[(((year - 4) % 10) + 10) % 10] + "子丑寅卯辰巳午未申酉戌亥"[(((year - 4) % 12) + 12) % 12];
}

/** 上一個／下一個流月，跨年時接到前後一年 */
export function shiftMonth(astrolabe: Astrolabe, sel: Selection, delta: 1 | -1): Selection {
  const months = monthsOf(astrolabe, sel.year);
  const key = sel.monthKey + delta;
  if (key >= 0 && key < months.length) return normalizeSelection(astrolabe, { ...sel, monthKey: key });
  const year = sel.year + delta;
  const next = monthsOf(astrolabe, year);
  return normalizeSelection(astrolabe, { ...sel, year, monthKey: delta > 0 ? 0 : next.length - 1 });
}

/** 上一天／下一天，跨月時接到前後一個流月 */
export function shiftDay(astrolabe: Astrolabe, sel: Selection, delta: 1 | -1): Selection {
  const entry = monthsOf(astrolabe, sel.year)[sel.monthKey];
  const day = sel.day + delta;
  if (day >= entry.dayRange[0] && day <= entry.dayRange[1]) return { ...sel, day };
  const moved = shiftMonth(astrolabe, sel, delta);
  const target = monthsOf(astrolabe, moved.year)[moved.monthKey];
  return { ...moved, day: delta > 0 ? target.dayRange[0] : target.dayRange[1] };
}

function solarString(s: { solarYear: number; solarMonth: number; solarDay: number }) {
  return `${s.solarYear}-${s.solarMonth}-${s.solarDay}`;
}
