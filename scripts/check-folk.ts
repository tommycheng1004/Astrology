// 農民曆避忌（歲破、月破、農曆七月）與流年頁資料的檢查。
// 1. 節氣表（香港天文台）比對 lunar-typescript 天文演算的十二節日期，以及月建、立春年支逐日推算（1901–2100）
// 2. 已知的農民曆日子與鬼月日期
// 3. 擇日：有避忌的日子不會出現在推薦名單；結婚選了另一半，沖對方的日子也排除；就醫類不避破日
// 執行：npx tsx scripts/check-folk.ts
import { Solar } from "lunar-typescript";
import { liunianInfo } from "../src/content/liunian";
import { dayGanzhi, pickDays } from "../src/lib/dateSelect";
import { almanacYearBranchOf, folkDayOf, jieDay, monthBranchOf } from "../src/lib/folkCalendar";
import { computeAstrolabe } from "../src/lib/ziwei";

let failed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : `：得到 ${JSON.stringify(actual)}，應為 ${JSON.stringify(expected)}`}`);
}

// 1a. 十二節的日期。lunar-typescript 的節氣表用簡體名稱
const JIE = ["小寒", "立春", "惊蛰", "清明", "立夏", "芒种", "小暑", "立秋", "白露", "寒露", "立冬", "大雪"];
/**
 * 已知差異：交節時刻在午夜前後幾分鐘，兩份資料的天文模型差一點就落在不同天。都是早年，天文台曆表為準。
 * 1917 大雪：lunar-typescript 12/8 00:00:59；1927 白露：9/9 00:05:25
 */
const KNOWN = ["1917-12", "1927-9"];
const diffs: string[] = [];
for (let y = 1901; y <= 2100; y++) {
  const table = Solar.fromYmd(y, 6, 1).getLunar().getJieQiTable();
  JIE.forEach((name, i) => {
    const m = i + 1;
    // 表裡的小寒、大雪可能是前後一年的，換用同一年的那一筆
    let s = table[name];
    if (s.getYear() !== y) s = table[m === 1 ? "XIAO_HAN" : "DA_XUE"];
    const ref = s.getYear() === y && s.getMonth() === m ? s.getDay() : null;
    if (ref !== jieDay(y, m)) diffs.push(`${y}-${m}`);
  });
}
check("十二節日期與天文演算相符（1901–2100，除已知兩筆）", diffs, KNOWN);

// 1b. 月建與年支逐日推算：節氣當天起換月、立春當天起換年
let days = 0;
const monthDiff: string[] = [];
const yearDiff: string[] = [];
for (let t = Date.UTC(1901, 0, 1); t <= Date.UTC(2100, 11, 31); t += 86400000) {
  const d = new Date(t);
  const [y, m, day] = [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
  // 當天 23:59 的月柱、年柱（交節當天不論幾點交節，到午夜前都已換月）
  const lunar = Solar.fromYmdHms(y, m, day, 23, 59, 59).getLunar();
  if (!KNOWN.includes(`${y}-${m}`) && monthBranchOf(y, m, day) !== lunar.getMonthZhiExact()) monthDiff.push(`${y}-${m}-${day}`);
  if (almanacYearBranchOf(y, m, day) !== lunar.getYearZhiExact()) yearDiff.push(`${y}-${m}-${day}`);
  days++;
}
check(`月建逐日推算 ${days} 天`, monthDiff.slice(0, 5), []);
check(`立春換年逐日推算 ${days} 天`, yearDiff.slice(0, 5), []);

// 2. 已知日子
check("2025-11-08 辛巳日為月破（立冬後亥月，巳沖亥）", [dayGanzhi(2025, 11, 8), folkDayOf(2025, 11, 8, "巳").yuePo], [{ stem: "辛", branch: "巳" }, true]);
check("2025-11-06 立冬前仍是戌月", monthBranchOf(2025, 11, 6), "戌");
check("2026-11-07 立冬當天起亥月", monthBranchOf(2026, 11, 7), "亥");
check("2027-02-04 立春當天農民曆換丁未年", [almanacYearBranchOf(2027, 2, 3), almanacYearBranchOf(2027, 2, 4)], ["午", "未"]);
check("2026 年農曆七月", liunianInfo(2026).ghost, "8/13–9/10");
check("2026-08-27 中元節在農曆七月", folkDayOf(2026, 8, 27, "子").ghost, true);
check("2025 閏六月不算鬼月、七月才算", [folkDayOf(2025, 8, 1, "子").ghost, folkDayOf(2025, 8, 23, "子").ghost], [false, true]);
const y2027 = liunianInfo(2027);
check("2027 年資料", [y2027.ganzhi, y2027.newYear, y2027.lichun, y2027.ghost, y2027.leap], ["丁未", "2027/2/6", "2027/2/4", "8/2–8/31", null]);
check("2027 年犯太歲", y2027.taisui.map((t) => `${t.zodiac}${t.label}`), ["羊值太歲", "牛沖、刑太歲", "狗刑、破太歲", "鼠害太歲"]);

// 3. 擇日（tsx 以 CommonJS 執行，不支援最上層 await）
(async () => {
  const me = await computeAstrolabe({ dateStr: "1992-8-15", timeIndex: 7 }, "女"); // 屬猴
  const from = new Date(2027, 6, 20); // 涵蓋 2027 年農曆七月（8/2–8/31）
  for (const id of ["wedding", "move", "deal", "health"]) {
    const r = pickDays(me, id, 90, from);
    check(`擇日 ${id}：推薦名單沒有要避開的日子`, r.best.filter((d) => d.flags.some((f) => f.blocks)).map((d) => d.date), []);
  }
  const ghostOf = (date: string) => {
    const [y, m, d] = date.split("-").map(Number);
    return folkDayOf(y, m, d, "子").ghost;
  };
  const wedding = pickDays(me, "wedding", 90, from);
  check("結婚避開農曆七月", wedding.best.some((d) => ghostOf(d.date)), false);
  check("結婚排除了整個農曆七月（30 天）", wedding.excluded.find((x) => x.kind === "ghost")?.count, 30);
  const withPartner = pickDays(me, "wedding", 90, from, "卯"); // 另一半屬兔，酉日沖兔
  check("選了另一半（屬兔）後，推薦名單沒有酉日", withPartner.best.some((d) => d.ganzhi.endsWith("酉日")), false);
  check("90 天內沖另一半的酉日有 7 或 8 天", [7, 8].includes(withPartner.excluded.find((x) => x.kind === "partner")?.count ?? 0), true);
  const health = pickDays(me, "health", 90, from);
  check("就醫不避破日", health.excluded.some((x) => x.kind === "yuePo" || x.kind === "suiPo"), false);
  const deal = pickDays(me, "deal", 90, from);
  check("簽約不避農曆七月、但避月破", [deal.excluded.some((x) => x.kind === "ghost"), deal.excluded.some((x) => x.kind === "yuePo")], [false, true]);

  console.log(failed ? `\n${failed} 項不符` : "\n全部通過");
  process.exit(failed ? 1 : 0);
})();
