import type { AuditRow } from "@/lib/adminTypes";
import { ACTION_LABEL, adminJson, guard } from "@/lib/server/admin";
import { query } from "@/lib/server/store";

type Entry = Omit<AuditRow, "id" | "actionLabel">;
const PAGE = 50;

/** 稽核紀錄，新到舊；before 為上一頁最後一筆的時間 */
export async function GET(request: Request) {
  const actor = await guard(request, "audit.read");
  if (actor instanceof Response) return actor;
  const before = new URL(request.url).searchParams.get("before");
  try {
    const rows = await query<Entry>({
      collection: "auditLog",
      orderBy: [["at", "desc"]],
      limit: PAGE,
      startAfter: before && !Number.isNaN(Date.parse(before)) ? [new Date(before)] : undefined,
    });
    const entries: AuditRow[] = rows.map((d) => ({ ...d.data, id: d.id, actionLabel: ACTION_LABEL[d.data.action] ?? d.data.action }));
    return adminJson({ entries, more: rows.length === PAGE });
  } catch (e) {
    console.error("[admin] 稽核紀錄讀取失敗", e);
    return adminJson({ error: "稽核紀錄讀取失敗，請稍後再試。" }, 502);
  }
}
