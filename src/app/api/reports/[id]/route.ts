import type { ReportRecord } from "@/lib/annualReport";
import { notConfigured, privateJson, readDocument, requestMember, usageConfigured } from "@/lib/server/firebase";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await requestMember(request);
  if (!member) return privateJson({ error: "請先登入會員。" }, 401);
  const { id } = await params;
  if (!usageConfigured) return notConfigured("報告");
  if (!/^[0-9a-f]{64}$/.test(id)) return privateJson({ error: "找不到報告。" }, 404);
  const entry = await readDocument<ReportRecord>(["users", member.uid, "reports", id]);
  if (!entry) return privateJson({ error: "找不到報告。" }, 404);
  if (entry.data.status === "pending" && Date.now() - entry.data.startedAt >= 120_000)
    return privateJson({ status: "failed", startedAt: entry.data.startedAt });
  return privateJson(entry.data.status === "ready" ? entry.data : { status: entry.data.status, startedAt: entry.data.startedAt });
}
