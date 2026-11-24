import type { Chart } from "@/lib/buildChart";
import { summarizeChart } from "@/lib/chartSummary";
import { SITE_URL } from "@/lib/site";

export function chartText(chart: Pick<Chart, "astrolabe" | "rulesText">, now = new Date()) {
  return chartTextWithFacts(chart, now).text;
}

export function chartTextWithFacts(chart: Pick<Chart, "astrolabe" | "rulesText">, now = new Date()) {
  const { summary, period, facts, placements } = summarizeChart(chart.astrolabe, chart.rulesText, now);
  const text = [
    summary,
    "",
    SITE_URL,
    "請只根據以上資料解讀，不要自行推算星曜位置",
  ].join("\n");
  return { text, facts, placements, period };
}
