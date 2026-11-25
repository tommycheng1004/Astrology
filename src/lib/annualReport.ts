import { MUTAGENS, palaceOfStar } from "@/lib/chartExtras";
import { dateScores, pickDays, PURPOSES } from "@/lib/dateSelect";
import { ALL_ASPECTS, analyzeLayer, overallGradeOf, overallOf } from "@/lib/fortune";
import { horoscopeAt, solarDateOf, yearEndDate, yearGanzhi, yearStartDate, monthsOf } from "@/lib/periods";
import { taisuiOf } from "@/lib/taisui";
import { palaceTitle, type Astrolabe } from "@/lib/ziwei";

export const REPORT_YEAR = 2027;
export const ANNUAL_REPORT = "report-2027";
export type ReportKind = "annual" | "monthly" | "deep";

const ranked = (astrolabe: Astrolabe, horoscope: NonNullable<ReturnType<typeof horoscopeAt>>, level: "yearly" | "monthly") =>
  analyzeLayer(astrolabe, horoscope, level, false, ALL_ASPECTS).sort((a, b) => b.score - a.score);

export function monthReport(astrolabe: Astrolabe, date: string, end = date) {
  const horoscope = horoscopeAt(astrolabe, date, 0, { date: end, hour: 11 });
  if (!horoscope) return null;
  const list = ranked(astrolabe, horoscope, "monthly");
  const best = list[0];
  const watch = list[list.length - 1];
  return {
    best: { label: best.label, level: best.level, summary: best.summary, insight: best.insights.find((i) => i.tone === "good")?.text ?? best.insights[0]?.text },
    watch: { label: watch.label, level: watch.level, summary: watch.summary, insight: watch.insights.find((i) => i.tone === "bad")?.text ?? watch.insights[0]?.text },
  };
}

export function annualPreview(astrolabe: Astrolabe) {
  const start = yearStartDate(REPORT_YEAR)!;
  const year = horoscopeAt(astrolabe, start, 0, { date: yearEndDate(REPORT_YEAR)!, hour: 11 });
  if (!year) return null;
  const ranking = ranked(astrolabe, year, "yearly");
  const first = monthsOf(astrolabe, REPORT_YEAR)[0];
  return {
    summary: `丁未年整體${overallGradeOf(overallOf(ranking).score)}，可多著力於${ranking[0].label}，並留意${ranking.at(-1)!.label}。`,
    january: monthReport(astrolabe, start, solarDateOf(REPORT_YEAR, first, first.dayRange[1])),
    januaryRange: first.solarRangeFull,
  };
}

export function annualReport(astrolabe: Astrolabe) {
  const preview = annualPreview(astrolabe);
  if (!preview) return null;
  const start = yearStartDate(REPORT_YEAR)!;
  const end = yearEndDate(REPORT_YEAR)!;
  const horoscope = horoscopeAt(astrolabe, start, 0, { date: end, hour: 11 })!;
  const startParts = start.split("-").map(Number);
  const endParts = end.split("-").map(Number);
  const span = Math.round((Date.UTC(endParts[0], endParts[1] - 1, endParts[2]) - Date.UTC(startParts[0], startParts[1] - 1, startParts[2])) / 86_400_000) + 1;
  const from = new Date(startParts[0], startParts[1] - 1, startParts[2]);
  const scores = dateScores(astrolabe, span, from);
  return {
    ...preview,
    aspects: analyzeLayer(astrolabe, horoscope, "yearly", false, ALL_ASPECTS).map(({ label, level, score, summary }) => ({ label, level, score, summary })),
    months: monthsOf(astrolabe, REPORT_YEAR).map((month) => ({
      label: month.label,
      range: month.solarRangeFull,
      focus: monthReport(astrolabe, solarDateOf(REPORT_YEAR, month, month.dayRange[0]), solarDateOf(REPORT_YEAR, month, month.dayRange[1])),
    })),
    taisui: taisuiOf(astrolabe.rawDates.chineseDate.yearly[1], yearGanzhi(REPORT_YEAR)[1]),
    mutagens: horoscope.yearly.mutagen.map((star, i) => ({
      star, change: MUTAGENS[i], palace: palaceTitle(palaceOfStar(astrolabe, star)?.name ?? ""),
    })),
    days: PURPOSES.map((purpose) => ({
      purpose: purpose.label,
      dates: pickDays(astrolabe, purpose.id, span, from, undefined, scores, false).best.slice(0, 3).map(({ date }) => date),
    })),
  };
}

export type AnnualReport = NonNullable<ReturnType<typeof annualReport>>;
export type MonthReport = NonNullable<ReturnType<typeof monthReport>>;
export type ReportData =
  | { kind: "annual"; facts: AnnualReport }
  | { kind: "monthly"; date: string; facts: MonthReport }
  | { kind: "deep"; facts: string };
export type ReportRecord = { status: "pending" | "failed"; startedAt: number }
  | { status: "ready"; report: ReportData; narrative: string | null };
