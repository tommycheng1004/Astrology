// 運勢頁一致性：各尺度的時段卡片分數要等於點進去的詳情分數；年份、月份、日子來回切換不能改掉日期（含閏月上下半月）
// 執行：npx tsx scripts/check-periods.ts
import { analyzeLayer, overallOf } from "../src/lib/fortune";
import { daysOf, horoscopeAt, monthsOf, normalizeSelection, shiftDay, shiftMonth, yearEndDate, type Level, type Selection } from "../src/lib/periods";
import { dayColumns, hourColumns, monthColumns, yearColumns } from "../src/lib/trend";
import { computeAstrolabe } from "../src/lib/ziwei";
let seed = 11; const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
const issues: string[] = [];
(async () => {
  for (let i = 0; i < 40; i++) {
    const y = i % 4 === 0 ? 2025 + Math.floor(rnd() * 2) : 1940 + Math.floor(rnd() * 80);
    const a = await computeAstrolabe({ dateStr: `${y}-${1 + Math.floor(rnd() * 12)}-${1 + Math.floor(rnd() * 28)}`, timeIndex: Math.floor(rnd() * 12) }, rnd() > 0.5 ? "男" : "女");
    const now: Selection = { year: 2026, monthKey: 0, day: 1, hour: 0 };
    const year = [2025, 2026, 2020, 2023][i % 4];
    const months = monthsOf(a, year);
    const entry = months[Math.floor(rnd() * months.length)];
    const days = daysOf(year, entry);
    const day = days[Math.floor(rnd() * days.length)];
    const hour = Math.floor(rnd() * 12);
    // 和 FortuneExplorer 相同的詳情算法
    const detail = (scale: Level) => {
      const end = scale === "hourly" ? undefined : scale === "daily" ? day.date : scale === "monthly" ? days[days.length - 1].date : yearEndDate(year)!;
      const h = horoscopeAt(a, day.date, hour, end ? { date: end, hour: 11 } : undefined);
      return h ? overallOf(analyzeLayer(a, h, scale)).score : null;
    };
    const chip = {
      yearly: yearColumns(a, year, now).find((c) => c.key === year)?.overall ?? null,
      monthly: monthColumns(a, year, months, now).find((c) => c.key === entry.key)?.overall ?? null,
      daily: dayColumns(a, days, false, now).find((c) => c.key === day.day)?.overall ?? null,
      hourly: hourColumns(a, day.date, false, now).find((c) => c.key === hour)?.overall ?? null,
    };
    for (const [scale, v] of Object.entries(chip)) {
      const d = detail(scale as Level);
      if (v !== d) issues.push(`${a.solarDate} ${year} ${entry.label}${day.label} ${scale}: 卡片 ${v} ≠ 詳情 ${d}`);
    }
    // 閏月／切換：年份來回切換、上下月來回，日子不能被改掉
    const sel: Selection = { year, monthKey: entry.key, day: day.day, hour };
    const back = normalizeSelection(a, { ...sel, year }, months);
    if (back.monthKey !== sel.monthKey || back.day !== sel.day) issues.push(`同年重選被改：${entry.label}${day.day} → ${months[back.monthKey].label}${back.day}`);
    const roundM = shiftMonth(a, shiftMonth(a, sel, 1), -1);
    if (roundM.monthKey !== sel.monthKey) issues.push(`下月再上月回不來：${entry.label} → ${monthsOf(a, roundM.year)[roundM.monthKey].label}`);
    const roundD = shiftDay(a, shiftDay(a, sel, 1), -1);
    if (roundD.monthKey !== sel.monthKey || roundD.day !== sel.day) issues.push(`隔天再前一天回不來：${entry.label}${day.day} → ${roundD.day}`);
  }
  console.log(issues.length ? issues.slice(0, 10).join("\n") : "✓ 卡片與詳情分數一致、切換不改日期");
  process.exit(issues.length ? 1 : 0);
})();
