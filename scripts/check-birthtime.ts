// 出生時間校正的回歸測試（升級 iztro 或改 birthtime.ts 後請重跑）
// 執行：npx tsx scripts/check-birthtime.ts
import { equationOfTime, resolveBirth, type BirthTimeOptions } from "../src/lib/birthtime";
import { analyzeLayer } from "../src/lib/fortune";
import { pickDays } from "../src/lib/dateSelect";
import { overallOf } from "../src/lib/fortune";
import { horoscopeAt, monthsOf, normalizeSelection, yearEndDate, yearStartDate } from "../src/lib/periods";
import { decadeColumns } from "../src/lib/trend";
import { computeAstrolabe, type BirthInput } from "../src/lib/ziwei";

let failed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : `\n    實際：${JSON.stringify(actual)}\n    預期：${JSON.stringify(expected)}`}`);
}

const input = (y: number, m: number, d: number): BirthInput => ({
  name: "", gender: "女", calendar: "solar", year: y, month: m, day: d, isLeapMonth: false, timeIndex: 0,
});
const at = (place: string, clock: string, trueSolar = false): BirthTimeOptions => ({ timeMode: "clock", clock, place, trueSolar });
const used = (y: number, m: number, d: number, o: BirthTimeOptions) => {
  const r = resolveBirth(input(y, m, d), o);
  return `${r.dateStr} ${r.usedClock}`;
};

// 時鐘撥快
check("台灣 1979-07-15 日光節約時間", used(1979, 7, 15, at("taipei", "10:30")), "1979-7-15 09:30");
check("台灣 1979-06-15 尚未實施", used(1979, 6, 15, at("taipei", "10:30")), "1979-6-15 10:30");
check("台灣 1947-10-15 夏令時間延長至 10/31", used(1947, 10, 15, at("taipei", "10:30")), "1947-10-15 09:30");
check("台灣 1944 日治東京時間", used(1944, 1, 15, at("taipei", "10:30")), "1944-1-15 09:30");
check("香港 1970 夏令時間", used(1970, 7, 1, at("hongkong", "10:30")), "1970-7-1 09:30");
check("中國 1988 夏令時間", used(1988, 7, 1, at("beijing", "10:30")), "1988-7-1 09:30");
check("雪梨 2000-01 南半球夏令", used(2000, 1, 15, at("sydney", "10:30")), "2000-1-15 09:30");
check("雪梨 2000-07 冬季不校正", used(2000, 7, 15, at("sydney", "10:30")), "2000-7-15 10:30");
check("洛杉磯 1943-01 二戰戰時時間", used(1943, 1, 15, at("losangeles", "10:30")), "1943-1-15 09:30");
check("新加坡 1975 標準時間 UTC+7:30 不誤判", used(1975, 7, 1, at("singapore", "10:30")), "1975-7-1 10:30");

// 均時差（對照天文年曆，容許 ±0.2 分）
for (const [date, expected] of [["2026-02-11", -14.2], ["2026-05-14", 3.6], ["2026-07-26", -6.5], ["2026-11-03", 16.4]] as const) {
  const v = equationOfTime(Date.parse(`${date}T04:00:00Z`));
  check(`均時差 ${date} ≈ ${expected} 分`, Math.abs(v - expected) <= 0.2, true);
}
check("真太陽時 新加坡 1990-06-01 12:30", used(1990, 6, 1, at("singapore", "12:30", true)), "1990-6-1 11:27");

// 時辰交界
const alt = (clock: string) => {
  const r = resolveBirth(input(1990, 5, 20), at("taipei", clock));
  return r.alt && { main: `${r.dateStr} ${r.timeIndex}`, alt: `${r.alt.dateStr} ${r.alt.timeIndex}`, minutes: r.alt.minutes };
};
check("10:52 接近午時", alt("10:52"), { main: "1990-5-20 5", alt: "1990-5-20 6", minutes: 8 });
check("11:00 剛進午時", alt("11:00"), { main: "1990-5-20 6", alt: "1990-5-20 5", minutes: 0 });
check("22:50 接近子時（隔日）", alt("22:50"), { main: "1990-5-20 11", alt: "1990-5-21 0", minutes: 10 });
check("23:10 晚子時，相鄰為當日亥時", alt("23:10"), { main: "1990-5-21 0", alt: "1990-5-20 11", minutes: 10 });
check("12:00 不在交界", alt("12:00"), null);

// 夏令時間切換當天：不存在與重複的鐘點
const dst = (y: number, m: number, d: number, clock: string) => {
  const r = resolveBirth(input(y, m, d), at("newyork", clock));
  return { main: `${r.dateStr} ${r.timeIndex}`, alt: r.alt && `${r.alt.dateStr} ${r.alt.timeIndex} ${r.alt.reason}`, noted: r.notes.some((n) => /不存在|兩次/.test(n)) };
};
check("紐約 2024-03-10 02:30 不存在，提醒且照未撥快計算", dst(2024, 3, 10, "02:30"), { main: "2024-3-10 1", alt: null, noted: true });
check("紐約 2024-11-03 01:30 出現兩次，子時／丑時兩種解釋", dst(2024, 11, 3, "01:30"), { main: "2024-11-3 0", alt: "2024-11-3 1 dst", noted: true });
check("紐約 2024-07-01 01:30 平常日不提醒", dst(2024, 7, 1, "01:30").noted, false);

// iztro #314（2.6.4 已修正）：農曆月底晚子時只進日不進月；本站先換成隔日子時，應與隔日早子時同盤
(async () => {
  const summary = async (r: ReturnType<typeof resolveBirth>) => {
    const a = await computeAstrolabe(r, "女");
    const soul = a.palaces.find((p) => p.name === "命宮")!;
    const zw = a.palaces.find((p) => p.majorStars.some((s) => s.name === "紫微"))!;
    return `${a.chineseDate} 命宮${soul.earthlyBranch} ${a.fiveElementsClass} 紫微在${zw.earthlyBranch}`;
  };
  check(
    "#314 1996-08-13 23:30 = 1996-08-14 00:30",
    await summary(resolveBirth(input(1996, 8, 13), at("taipei", "23:30"))),
    await summary(resolveBirth(input(1996, 8, 14), at("taipei", "00:30"))),
  );
  // 出生前不算運勢：同一個農曆年、虛歲同為 1 也要擋；但出生那一年的流年要能看
  const late = await computeAstrolabe({ dateStr: "2026-12-20", timeIndex: 6 }, "男");
  check("2026-12-20 出生，11/1 的流日不算", horoscopeAt(late, "2026-11-1", 0, { date: "2026-11-1", hour: 11 }), null);
  check("2026-12-20 出生，當年流年可看（以出生時刻計）", !!horoscopeAt(late, "2026-2-17", 0, { date: "2027-2-5", hour: 11 }), true);
  check("出生當天出生前的時辰不算", horoscopeAt(late, "2026-12-20", 3), null);

  // 童限：虛歲未到起運歲數，不能顯示成該宮本命的大限
  const baby = await computeAstrolabe({ dateStr: "2026-1-1", timeIndex: 6 }, "女");
  const hb = horoscopeAt(baby, "2026-11-1")!;
  check("2026-01-01 生，2026-11-01 走童限", hb.decadal.name, "童限");
  check("童限文字不寫大限、這十年", analyzeLayer(baby, hb, "decadal").every((r) => r.insights.every((i) => !/大限|這十年/.test(i.text))), true);
  check("大運列表第一格是童限，標明是幾歲那年", decadeColumns(baby, { year: 2026, monthKey: 0, day: 1, hour: 0 })[0].sub, "童限・2歲");

  // 閏月下半月：切換年份後不能被改成上半月
  const m2025 = monthsOf(baby, 2025);
  const leapSecond = m2025.find((m) => m.isLeap && m.dayRange[0] === 16)!;
  const kept = normalizeSelection(baby, { year: 2025, monthKey: leapSecond.key, day: 20, hour: 0 }, m2025);
  check("2025 閏六月二十切換年份後仍是閏六月二十", `${m2025[kept.monthKey].label} ${kept.day}`, "閏六月下 20");

  // 閏月三十換到閏月只有二十九天的年份：收到二十九，不能跳回上半月十五
  const m2017 = monthsOf(baby, 2017);
  const leap30 = m2017.find((m) => m.isLeap && m.dayRange[0] === 16)!;
  const moved = normalizeSelection(baby, { year: 2025, monthKey: leap30.key, day: 30, hour: 0 }, m2017);
  check("2017 閏六月三十切到 2025 年成為閏六月二十九", `${monthsOf(baby, 2025)[moved.monthKey].label} ${moved.day}`, "閏六月下 29");

  // 擇日：同一天不能同時是推薦與避開
  const newborn = await computeAstrolabe({ dateStr: "2026-11-27", timeIndex: 6 }, "女");
  const picks = pickDays(newborn, "deal", 30, new Date(2026, 10, 1));
  check("出生後只有幾天可算時，推薦與避開不重複", picks.best.some((b) => picks.avoid.some((a) => a.date === b.date)), false);

  // 大限卡片分數要等於點進去後詳情的分數（童限逐年、一般大限十年內每一年）
  const scoreAt = (astro: typeof baby, year: number) =>
    overallOf(analyzeLayer(astro, horoscopeAt(astro, yearStartDate(year)!, 0, { date: yearEndDate(year)!, hour: 11 })!, "decadal")).score;
  const babyCols = decadeColumns(baby, { year: 2026, monthKey: 0, day: 1, hour: 0 }, 2026);
  check("童限卡片＝2026 年詳情", babyCols[0].overall, scoreAt(baby, 2026));
  let mismatch = 0;
  for (const col of decadeColumns(late, { year: 2026, monthKey: 0, day: 1, hour: 0 }).slice(1, 6))
    for (let y = col.key; y < col.key + (col.span ?? 10); y++) if (col.overall !== scoreAt(late, y)) mismatch++;
  check("一般大限卡片＝十年內每一年的詳情", mismatch, 0);

  console.log(failed ? `\n${failed} 項不符` : "\n全部通過");
  process.exit(failed ? 1 : 0);
})();
