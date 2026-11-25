import { createHash, randomUUID } from "node:crypto";
import { after } from "next/server";
import { ANNUAL_REPORT, annualPreview, annualReport, monthReport, type ReportData, type ReportKind, type ReportRecord } from "@/lib/annualReport";
import { buildChart } from "@/lib/buildChart";
import { chartText } from "@/lib/chartText";
import { taiwanNow } from "@/lib/chartSummary";
import { notConfigured, privateJson, readDocument, requestMember, usageConfigured, writeDocuments } from "@/lib/server/firebase";
import { reportNarrative } from "@/lib/server/reportNarrative";
import { parseShareHash, shareHash } from "@/lib/shareLink";

type Pending = { status: "pending"; startedAt: number; job: string };
type Stored = ReportRecord & { job?: string };
const recoverAfter = 120_000;

export async function POST(request: Request) {
  const member = await requestMember(request);
  if (!member) return privateJson({ error: "請先登入會員。" }, 401);
  if (!usageConfigured) return notConfigured("報告");
  const body = await request.json().catch(() => null);
  if (!body || !["annual", "monthly", "deep"].includes(body.kind) || typeof body.birth !== "string" || body.birth.length > 150)
    return privateJson({ error: "報告資料有誤。" }, 400);
  const birth = parseShareHash(`#c=${body.birth}`);
  if (!birth) return privateJson({ error: "生辰資料有誤。" }, 400);
  const kind = body.kind as ReportKind;
  const variant = body.variant === "alt" ? "alt" : "main";
  const now = new Date();
  const date = taiwanNow(now).date;
  const period = kind === "annual" ? ANNUAL_REPORT : date.split("-").slice(0, 2).join("-");
  const id = createHash("sha256").update(JSON.stringify([kind, period, shareHash(birth), variant])).digest("hex");
  const path = ["users", member.uid, "reports", id];
  const aiAvailable = process.env.NEXT_PUBLIC_AI_ENABLED === "1" && !!process.env.GEMINI_API_KEY;
  const withNarrative = aiAvailable && body.aiConsent === true;
  const existing = await readDocument<Stored>(path);
  const ready = existing?.data.status === "ready" ? existing.data : null;
  if (ready && (ready.narrative || !withNarrative)) return privateJson({ id, status: "ready" });
  if (existing?.data.status === "pending" && Date.now() - existing.data.startedAt < recoverAfter)
    return privateJson({ id, status: "pending" }, 202);
  if (kind === "deep" && !withNarrative)
    return privateJson({ error: aiAvailable ? "請先同意以 AI 整理深度解盤。" : "深度解盤目前尚未開放。" }, aiAvailable ? 400 : 503);

  const chart = await buildChart(birth, variant, "share").catch(() => null);
  if (!chart) return privateJson({ error: "無法排出命盤，請確認生辰資料。" }, 400);
  if (kind === "annual" && !annualPreview(chart.astrolabe)) return privateJson({ error: "這張命盤不在 2027 年的可排盤範圍。" }, 422);
  const [year, month] = date.split("-").map(Number);
  const monthEnd = new Date(year, month, 0).getDate();
  const monthly = kind === "monthly" ? monthReport(chart.astrolabe, `${period}-1`, `${period}-${monthEnd}`) : null;
  if (kind === "monthly" && !monthly) return privateJson({ error: "這張命盤不在本月的可排盤範圍。" }, 422);

  const pending: Pending = { status: "pending", startedAt: now.getTime(), job: randomUUID() };
  if (!await writeDocuments([{ path, data: pending, version: existing?.version ?? false }]))
    return privateJson({ id, status: "pending" }, 202);

  after(async () => {
    let final: ReportRecord;
    try {
      let report: ReportData;
      if (ready) {
        report = ready.report;
      } else if (kind === "annual") {
        const facts = annualReport(chart.astrolabe);
        if (!facts) throw new Error("Report year out of range");
        report = { kind, facts };
      } else if (kind === "monthly") {
        report = { kind, date: period, facts: monthly! };
      } else {
        report = { kind: "deep", facts: chartText(chart, now) };
      }
      const narrative = withNarrative ? await reportNarrative(report).catch((error) => {
        if (kind === "deep") throw error;
        console.error("[reports] AI narrative failed", (error as Error).name, { status: (error as { status?: number }).status });
        return null;
      }) : null;
      final = { status: "ready", report, narrative };
    } catch (error) {
      console.error("[reports] generation failed", (error as Error).name, { kind, status: (error as { status?: number }).status });
      final = ready ?? { status: "failed", startedAt: pending.startedAt };
    }
    const latest = await readDocument<Stored>(path);
    if (latest?.data.job === pending.job) await writeDocuments([{ path, data: final, version: latest.version }]);
  });

  return privateJson({ id, status: "pending" }, 202);
}
