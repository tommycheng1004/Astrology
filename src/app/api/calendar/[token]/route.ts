import { monthReport } from "@/lib/annualReport";
import { buildChart } from "@/lib/buildChart";
import { taiwanNow } from "@/lib/chartSummary";
import { calendarPath, icalendar, tokenPath, type CalendarSettings } from "@/lib/server/calendar";
import { readDocument, usageConfigured } from "@/lib/server/firebase";
import { parseShareHash } from "@/lib/shareLink";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const missing = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  if (!usageConfigured || !/^[A-Za-z0-9_-]{43}$/.test(token)) return missing();
  const mapping = await readDocument<{ uid: string }>(tokenPath(token));
  if (!mapping) return missing();
  const entry = await readDocument<CalendarSettings>(calendarPath(mapping.data.uid));
  if (entry?.data.token !== token) return missing();
  const entries: Parameters<typeof icalendar>[0] = entry.data.dates.map((date) => ({
    id: `saved-${date}-${token.slice(0, 8)}`, date, title: "紫微命盤 · 已存擇日",
  }));
  const saved = entry.data.chart;
  const birth = saved && parseShareHash(`#c=${saved.birth}`);
  if (birth) {
    const chart = await buildChart(birth, saved.variant, "share");
    const [year, month, day] = taiwanNow().date.split("-").map(Number);
    for (let index = 0; index < 3; index++) {
      const first = new Date(Date.UTC(year, month - 1 + index + (day === 1 ? 0 : 1), 1));
      const date = first.toISOString().slice(0, 10);
      const focus = monthReport(chart.astrolabe, date);
      if (focus) entries.push({
        id: `month-${date}-${token.slice(0, 8)}`,
        date,
        title: "紫微命盤 · 流月提醒",
        description: `可多著力於${focus.best.label}，並留意${focus.watch.label}。命理內容供參考。涉及健康、投資或法律，請諮詢專業人士。`,
      });
    }
  }
  return new Response(icalendar(entries), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "public, max-age=21600",
      "Netlify-CDN-Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
