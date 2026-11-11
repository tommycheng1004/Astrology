// 農曆換算全區間檢查（1900-01-31 ~ 2100-12-31，逐日）
// 0. 網站自帶的曆表（lunar.ts）與 lunar-lite 逐日一致（1899–2200 整個曆表範圍）
// 1. 國曆 → 農曆 → 國曆 往返一致（表單農曆輸入走的就是這條路）
// 2. 列出與 Intl 中國曆不同的區段，再逐一對照香港天文台曆表（HKO）判斷
// 執行：npx tsx scripts/verify-lunar.ts
import { solar2lunar } from "lunar-lite";
import { solarToLunar } from "../src/lib/lunar";
import { leapMonthOf, lunarMonthDays, lunarToSolar } from "../src/lib/ziwei";

let tableErrors = 0;
let tableDays = 0;
for (let t = Date.UTC(1899, 1, 10); t <= Date.UTC(2200, 11, 31); t += 86400000) {
  tableDays++;
  const d = new Date(t);
  const ref = solar2lunar(`${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`);
  const mine = solarToLunar(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  if (ref.lunarYear !== mine.lunarYear || ref.lunarMonth !== mine.lunarMonth || ref.lunarDay !== mine.lunarDay || ref.isLeap !== mine.isLeap) {
    if (tableErrors++ < 5) console.log("曆表不一致", d.toISOString().slice(0, 10), JSON.stringify(ref), JSON.stringify(mine));
  }
}

const MONTHS: Record<string, number> = { 正: 1, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 十一: 11, 冬: 11, 十二: 12, 臘: 12, 腊: 12 };
const fmt = new Intl.DateTimeFormat("zh-TW-u-ca-chinese", { timeZone: "Asia/Taipei", month: "long", day: "numeric" });

let roundTripErrors = 0;
let days = 0;
const diffs: string[] = [];
let open: { from: string; mine: string; theirs: string } | null = null;
let last = "";

for (let t = Date.UTC(1900, 0, 31); t <= Date.UTC(2100, 11, 31); t += 86400000) {
  days++;
  const d = new Date(t);
  const [y, m, dd] = [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
  const iso = `${y}-${m}-${dd}`;
  const l = solar2lunar(iso);
  const back = lunarToSolar(l.lunarYear, l.lunarMonth, l.lunarDay, l.isLeap);
  if (`${back.solarYear}-${back.solarMonth}-${back.solarDay}` !== iso) roundTripErrors++;

  const parts = fmt.formatToParts(new Date(Date.UTC(y, m - 1, dd, 4)));
  const month = parts.find((p) => p.type === "month")!.value;
  const theirs = `${/閏/.test(month) ? "閏" : ""}${MONTHS[month.replace(/[閏月]/g, "")]}月${Number(parts.find((p) => p.type === "day")!.value)}日`;
  const mine = `${l.isLeap ? "閏" : ""}${l.lunarMonth}月${l.lunarDay}日`;
  if (mine !== theirs && !open) open = { from: iso, mine, theirs };
  if (mine === theirs && open) {
    diffs.push(`${open.from} ~ ${last}：本站 ${open.mine}，Intl ${open.theirs}`);
    open = null;
  }
  last = iso;
}

// 表單用的閏月與大小月判斷，需與換算結果一致
let formErrors = 0;
for (let y = 1900; y <= 2100; y++) {
  const leap = leapMonthOf(y);
  for (let m = 1; m <= 12; m++) {
    for (const isLeap of leap === m ? [false, true] : [false]) {
      const n = lunarMonthDays(y, m, isLeap);
      const end = lunarToSolar(y, m, n, isLeap);
      const check = solar2lunar(`${end.solarYear}-${end.solarMonth}-${end.solarDay}`);
      const next = new Date(Date.UTC(end.solarYear, end.solarMonth - 1, end.solarDay + 1));
      const after = solar2lunar(`${next.getUTCFullYear()}-${next.getUTCMonth() + 1}-${next.getUTCDate()}`);
      // 月底那天要對得上，隔天要是下個月初一
      if (check.lunarDay !== n || check.lunarMonth !== m || check.isLeap !== isLeap || after.lunarDay !== 1) formErrors++;
    }
  }
}

console.log(`${tableErrors ? "✗" : "✓"} 自帶曆表與 lunar-lite 逐日比對 ${tableDays} 天：${tableErrors ? `${tableErrors} 天不一致` : "全部一致"}`);
console.log(`逐日檢查 ${days} 天`);
console.log(`${roundTripErrors ? "✗" : "✓"} 國曆→農曆→國曆往返：${roundTripErrors ? `${roundTripErrors} 天不一致` : "全部一致"}`);
console.log(`${formErrors ? "✗" : "✓"} 表單閏月與大小月：${formErrors ? `${formErrors} 個月份不一致` : "全部一致"}`);
console.log(`\n與 Intl 中國曆不同的區段（${diffs.length} 段，需對照官方曆表）：\n${diffs.join("\n")}`);
