import type { SavedBirth } from "@/components/BirthForm";
import { PLACES } from "@/lib/birthtime";
import { daysInMonth, leapMonthOf, MAX_YEAR, MIN_YEAR } from "@/lib/ziwei";

/**
 * 分享連結：生辰資料放在網址的 # 之後。瀏覽器不會把 # 後面的內容送到伺服器，
 * 所以仍符合「資料只在瀏覽器中計算」；姓名不放進連結。
 * 格式：#c=版本.性別.曆法.年.月.日.閏月.時辰.時間模式.鐘點.出生地.真太陽時
 */

const VERSION = "1";

export function shareHash(saved: SavedBirth) {
  const { input } = saved;
  const parts = [
    VERSION,
    input.gender === "男" ? "m" : "f",
    input.calendar === "lunar" ? "l" : "s",
    input.year,
    input.month,
    input.day,
    input.isLeapMonth ? 1 : 0,
    input.timeIndex,
    saved.timeMode === "clock" ? "c" : "s",
    saved.timeMode === "clock" ? saved.clock.replace(":", "") : "",
    saved.place,
    saved.trueSolar ? 1 : 0,
  ];
  return `#c=${parts.join(".")}`;
}

export function shareUrl(saved: SavedBirth) {
  return `${location.origin}${location.pathname}${shareHash(saved)}`;
}

/**
 * 傳到 LINE 的連結。
 * - 分享出去的網址加上 openExternalBrowser=1（LINE 官方參數）：對方在 LINE 裡點開時改用手機的預設瀏覽器，
 *   之後存的命盤才會留在平常用的瀏覽器，而不是 LINE 的內建瀏覽器。
 * - 手機用 line.me/R/share 開 LINE 的分享畫面；電腦版 LINE 不支援這個網址，改用 LINE 的網頁分享。
 */
export function lineShareHref(saved: SavedBirth) {
  const url = `${location.origin}${location.pathname}?openExternalBrowser=1${shareHash(saved)}`;
  const touch = window.matchMedia("(pointer: coarse)").matches;
  return touch
    ? `https://line.me/R/share?text=${encodeURIComponent(`我的紫微命盤 ${url}`)}`
    : `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`;
}

const int = (s: string, min: number, max: number) => {
  const n = Number(s);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

/** 解析網址的 #c=…；格式不對就回傳 null */
export function parseShareHash(hash: string): SavedBirth | null {
  const m = /^#c=([\w.]+)$/.exec(hash);
  if (!m) return null;
  const [version, g, cal, y, mo, d, leap, ti, mode, clock, place, solar] = m[1].split(".");
  if (version !== VERSION || !["m", "f"].includes(g) || !["l", "s"].includes(cal) || !["c", "s"].includes(mode)) return null;
  const year = int(y, MIN_YEAR, MAX_YEAR);
  const month = int(mo, 1, 12);
  const day = int(d, 1, 31);
  const timeIndex = int(ti, 0, 12);
  if (year === null || month === null || day === null || timeIndex === null) return null;
  const calendar = cal === "l" ? "lunar" : "solar";
  const isLeapMonth = calendar === "lunar" && leap === "1";
  if (isLeapMonth && leapMonthOf(year) !== month) return null;
  if (day > daysInMonth({ calendar, year, month, isLeapMonth })) return null;
  if (!PLACES.some((p) => p.id === place)) return null;
  const clockText = /^([01]\d|2[0-3])[0-5]\d$/.test(clock) ? `${clock.slice(0, 2)}:${clock.slice(2)}` : null;
  if (mode === "c" && !clockText) return null;
  return {
    input: {
      name: "",
      gender: g === "m" ? "男" : "女",
      calendar,
      year,
      month,
      day,
      isLeapMonth,
      timeIndex,
    },
    timeMode: mode === "c" ? "clock" : "slot",
    clock: clockText ?? "",
    place,
    trueSolar: solar === "1",
  };
}
