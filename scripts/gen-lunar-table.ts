// 產生 src/lib/lunarData.ts：1899–2200 每個農曆年的閏月與大小月。
// 資料取自 lunar-lite 的國曆→農曆換算（1900–2100 已逐日驗證，見 verify-lunar.ts），
// 讓網站不必在首頁載入整套農曆函式庫（含節日資料約 100 KB gzip）。
// 執行：npx tsx scripts/gen-lunar-table.ts
import { writeFileSync } from "node:fs";
import { solar2lunar } from "lunar-lite";

const FIRST = 1899;
const LAST = 2200;
const DAY = 86400000;
const iso = (t: number) => {
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
};

// 找到 FIRST 年正月初一
let t = Date.UTC(FIRST, 0, 1);
while (!(solar2lunar(iso(t)).lunarYear === FIRST && solar2lunar(iso(t)).lunarMonth === 1 && solar2lunar(iso(t)).lunarDay === 1)) t += DAY;
const base = new Date(t);

const years: number[] = [];
for (let y = FIRST; y <= LAST; y++) {
  let bits = 0;
  let leap = 0;
  let i = 0;
  // 逐月：從初一往後找下一個初一
  for (;;) {
    const start = solar2lunar(iso(t));
    if (start.lunarYear !== y || start.lunarDay !== 1) throw new Error(`${iso(t)} 不是 ${y} 年的月初`);
    if (start.isLeap) leap = start.lunarMonth;
    let len = 1;
    while (solar2lunar(iso(t + len * DAY)).lunarDay !== 1) len++;
    if (len !== 29 && len !== 30) throw new Error(`${y} 年 ${start.lunarMonth} 月長度 ${len}`);
    if (len === 30) bits |= 1 << i;
    i++;
    t += len * DAY;
    if (solar2lunar(iso(t)).lunarYear !== y) break;
  }
  if (i !== (leap ? 13 : 12)) throw new Error(`${y} 年有 ${i} 個月`);
  years.push((leap << 13) | bits);
}

writeFileSync(
  new URL("../src/lib/lunarData.ts", import.meta.url),
  `// 由 scripts/gen-lunar-table.ts 產生，請勿手動修改。
// 每個農曆年一個數字：第 13–16 位元為閏幾月（0 表示無閏月），第 0–12 位元依序為各月（含閏月）是否為大月（30 日）。

export const LUNAR_FIRST_YEAR = ${FIRST};
/** ${FIRST} 年正月初一的國曆日期（UTC 毫秒） */
export const LUNAR_BASE = Date.UTC(${base.getUTCFullYear()}, ${base.getUTCMonth()}, ${base.getUTCDate()});
export const LUNAR_YEARS = [
${years.map((v, k) => (k % 12 === 0 ? "  " : "") + `0x${v.toString(16)},` + (k % 12 === 11 ? "\n" : " ")).join("").trimEnd()}
];
`,
);
console.log(`${FIRST}–${LAST}，${years.length} 年，起點 ${base.toISOString().slice(0, 10)}`);
