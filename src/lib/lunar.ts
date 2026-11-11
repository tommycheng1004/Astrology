import { LUNAR_BASE, LUNAR_FIRST_YEAR, LUNAR_YEARS } from "@/lib/lunarData";

/**
 * 農曆換算（1899–2200），以 lunarData.ts 的閏月與大小月表推算，不需載入整套農曆函式庫。
 * 表由 lunar-lite 產生，1900–2100 年逐日對照驗證（scripts/verify-lunar.ts）。
 */

export type SolarParts = { solarYear: number; solarMonth: number; solarDay: number };
export type LunarParts = { lunarYear: number; lunarMonth: number; lunarDay: number; isLeap: boolean };

const DAY = 86400000;
const LAST_YEAR = LUNAR_FIRST_YEAR + LUNAR_YEARS.length - 1;

/** 某農曆年的各月（依時間順序，含閏月） */
function monthsOf(year: number) {
  const value = LUNAR_YEARS[year - LUNAR_FIRST_YEAR];
  if (value === undefined) throw new RangeError(`農曆 ${year} 年超出曆表範圍`);
  const leap = value >> 13;
  const months: { month: number; isLeap: boolean; days: 29 | 30 }[] = [];
  for (let i = 0, m = 1; i < (leap ? 13 : 12); i++) {
    const isLeap = leap > 0 && i === leap;
    months.push({ month: isLeap ? leap : m, isLeap, days: value & (1 << i) ? 30 : 29 });
    if (!isLeap) m++;
  }
  return months;
}

const yearDays = (year: number) => monthsOf(year).reduce((s, m) => s + m.days, 0);

/** 各年正月初一距 LUNAR_BASE 的天數，第一次用到時才算 */
let newYearOffsets: number[] | null = null;
function newYearOffset(year: number) {
  if (!newYearOffsets) {
    newYearOffsets = [0];
    for (let y = LUNAR_FIRST_YEAR; y < LAST_YEAR; y++) newYearOffsets.push(newYearOffsets[newYearOffsets.length - 1] + yearDays(y));
  }
  return newYearOffsets[year - LUNAR_FIRST_YEAR];
}

function toParts(ms: number): SolarParts {
  const d = new Date(ms);
  return { solarYear: d.getUTCFullYear(), solarMonth: d.getUTCMonth() + 1, solarDay: d.getUTCDate() };
}

/** 該農曆年閏幾月，沒有閏月回傳 null */
export function leapMonthOf(year: number): number | null {
  try {
    return monthsOf(year).find((m) => m.isLeap)?.month ?? null;
  } catch {
    return null;
  }
}

/** 農曆某月是大月（30 日）還是小月（29 日）。指定閏月但當年沒有該閏月時，視為本月 */
export function lunarMonthDays(year: number, month: number, isLeap: boolean): 29 | 30 {
  const leap = isLeap && leapMonthOf(year) === month;
  return monthsOf(year).find((m) => m.month === month && m.isLeap === leap)?.days ?? 29;
}

/** 農曆轉國曆。日期不存在（例如小月的三十日）時拋出錯誤；指定閏月但當年沒有該閏月時，視為本月 */
export function lunarToSolar(year: number, month: number, day: number, isLeap = false): SolarParts {
  const months = monthsOf(year);
  const leap = isLeap && leapMonthOf(year) === month;
  let offset = newYearOffset(year);
  for (const m of months) {
    if (m.month === month && m.isLeap === leap) {
      if (!Number.isInteger(day) || day < 1 || day > m.days) break;
      return toParts(LUNAR_BASE + (offset + day - 1) * DAY);
    }
    offset += m.days;
  }
  throw new RangeError(`查無農曆 ${year} 年${leap ? "閏" : ""}${month} 月 ${day} 日`);
}

/** 國曆轉農曆（月份從 1 起算） */
export function solarToLunar(year: number, month: number, day: number): LunarParts {
  let days = Math.round((Date.UTC(year, month - 1, day) - LUNAR_BASE) / DAY);
  if (days < 0) throw new RangeError("日期早於曆表範圍");
  // 先用平均年長估計，再前後微調
  let y = Math.min(LAST_YEAR, LUNAR_FIRST_YEAR + Math.floor(days / 365.2422));
  while (y > LUNAR_FIRST_YEAR && newYearOffset(y) > days) y--;
  while (y < LAST_YEAR && newYearOffset(y + 1) <= days) y++;
  days -= newYearOffset(y);
  for (const m of monthsOf(y)) {
    if (days < m.days) return { lunarYear: y, lunarMonth: m.month, lunarDay: days + 1, isLeap: m.isLeap };
    days -= m.days;
  }
  throw new RangeError("日期晚於曆表範圍");
}

/** 國曆日期字串 YYYY-M-D 轉農曆 */
export function solarStringToLunar(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return solarToLunar(y, m, d);
}
