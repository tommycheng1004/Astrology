// 產生 src/lib/solarTermsData.ts：1901–2100 每年十二個「節」（月建交界）落在國曆幾號。
// 資料取自香港天文台的公曆與農曆日期對照表（UTC+8，與台灣同時區）：
//   https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T{年}c.txt
// 先把 1901–2100 的檔案下載到同一個資料夾，再執行：
//   npx tsx scripts/gen-solar-terms.ts <資料夾>
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FIRST = 1901;
const LAST = 2100;
/** 十二節，依國曆月份排列：一月小寒（丑月起）、二月立春（寅月起）……十二月大雪（子月起） */
const JIE = ["小寒", "立春", "驚蟄", "清明", "立夏", "芒種", "小暑", "立秋", "白露", "寒露", "立冬", "大雪"];
/** 編碼：日期減 3 成為一位數（各節都落在當月 3–12 日） */
const OFFSET = 3;

const dir = process.argv[2];
if (!dir) throw new Error("用法：npx tsx scripts/gen-solar-terms.ts <香港天文台曆表資料夾>");

const rows: string[] = [];
for (let y = FIRST; y <= LAST; y++) {
  const text = readFileSync(join(dir, `T${y}c.txt`), "utf8");
  const days = new Map<number, number>();
  for (const line of text.split(/\r?\n/)) {
    const m = /^(\d{4})年(\d{1,2})月(\d{1,2})日\s+\S+\s+星期\S\s+(\S+)/.exec(line.replace(/^﻿/, ""));
    if (!m || Number(m[1]) !== y) continue;
    const i = JIE.indexOf(m[4]);
    if (i < 0) continue;
    if (Number(m[2]) !== i + 1) throw new Error(`${y} 年${m[4]}不在 ${i + 1} 月：${line}`);
    const day = Number(m[3]);
    // 天文台的檔案偶爾同一天印兩行，只要日期一致就好
    if (days.has(i) && days.get(i) !== day) throw new Error(`${y} 年${m[4]}有兩個日期`);
    days.set(i, day);
  }
  if (days.size !== 12) throw new Error(`${y} 年只找到 ${days.size} 個節`);
  rows.push(
    JIE.map((name, i) => {
      const v = days.get(i)! - OFFSET;
      if (v < 0 || v > 9) throw new Error(`${y} 年${name}在 ${days.get(i)} 日，超出編碼範圍`);
      return v;
    }).join(""),
  );
}

const body = rows.map((r, i) => `  "${r}", // ${FIRST + i}`).join("\n");
writeFileSync(
  new URL("../src/lib/solarTermsData.ts", import.meta.url),
  `// 由 scripts/gen-solar-terms.ts 產生，請勿手動修改。資料來源：香港天文台公曆與農曆日期對照表（UTC+8）。
// 每年一個字串，12 位數依序是 1–12 月的「節」（小寒、立春、驚蟄、清明、立夏、芒種、小暑、立秋、白露、寒露、立冬、大雪）
// 落在當月幾號，減 ${OFFSET} 後的值。

export const JIE_FIRST_YEAR = ${FIRST};
export const JIE_LAST_YEAR = ${LAST};
export const JIE_DAY_OFFSET = ${OFFSET};
export const JIE_DAYS = [
${body}
];
`,
);
console.log(`已產生 ${rows.length} 年（${FIRST}–${LAST}）`);
