import type { MemberDetail } from "@/lib/adminTypes";
import { adminJson, auditEntry, guard, reasonOf } from "@/lib/server/admin";
import { taiwanDate } from "@/lib/server/firebase";
import { appConfig, toRow, UID_PATTERN, type MemberDoc } from "@/lib/server/members";
import { aggregate, commit, getDoc } from "@/lib/server/store";

type Params = { params: Promise<{ uid: string }> };

/** 會員詳情：帳號資訊、命盤與報告「數量」（依決定不顯示生辰內容）、近兩天 AI 用量 */
export async function GET(request: Request, { params }: Params) {
  const actor = await guard(request, "members.read");
  if (actor instanceof Response) return actor;
  const { uid } = await params;
  if (!UID_PATTERN.test(uid)) return adminJson({ error: "找不到這位會員。" }, 404);
  try {
    const doc = await getDoc<MemberDoc>(["members", uid]);
    if (!doc) return adminJson({ error: "找不到這位會員。" }, 404);
    const dates = [taiwanDate(), taiwanDate(Date.now() - 86400_000)];
    const [charts, reports, config, ...usage] = await Promise.all([
      aggregate({ collection: "charts", parent: ["users", uid] }, { count: true }),
      aggregate({ collection: "reports", parent: ["users", uid] }, { count: true }),
      appConfig(),
      ...dates.map((date) => getDoc<{ count: number }>(["usage", `${date}_m_${uid}`])),
    ]);
    const row = toRow(doc);
    const detail: MemberDetail = {
      ...row,
      charts,
      reports,
      usage: dates.map((date, i) => ({ date, count: usage[i]?.data.count ?? 0 })),
      effectiveLimit: row.dailyLimit ?? (row.verified ? config.dailyMember : config.dailyGuest),
    };
    return adminJson(detail);
  } catch (e) {
    console.error("[admin] 會員詳情讀取失敗", e);
    return adminJson({ error: "會員資料讀取失敗，請稍後再試。" }, 502);
  }
}

/** 調整個人每日 AI 題數：{ dailyLimit: 0–500 或 null（恢復全站設定）, reason } */
export async function PATCH(request: Request, { params }: Params) {
  const actor = await guard(request, "members.quota", { write: true });
  if (actor instanceof Response) return actor;
  const { uid } = await params;
  if (!UID_PATTERN.test(uid)) return adminJson({ error: "找不到這位會員。" }, 404);
  const body = await request.json().catch(() => null);
  const reason = reasonOf(body);
  const value = body?.dailyLimit;
  if (!(value === null || (Number.isInteger(value) && value >= 0 && value <= 500)))
    return adminJson({ error: "每日題數請填 0–500 的整數，或選擇沿用全站設定。" }, 400);
  if (!reason) return adminJson({ error: "請填寫修改原因（2–200 字）。" }, 400);
  const doc = await getDoc<MemberDoc>(["members", uid]);
  if (!doc) return adminJson({ error: "找不到這位會員。" }, 404);
  const before = doc.data.dailyLimit ?? null;
  const ok = await commit([
    { op: "set", path: ["members", uid], fields: { dailyLimit: value }, updateTime: doc.updateTime },
    auditEntry(actor, "member.quota", `${doc.data.email || uid}（${uid}）`, { before, after: value }, reason),
  ]);
  if (!ok) return adminJson({ error: "資料剛被其他人更新，請重新整理後再試。" }, 409);
  return adminJson({ ok: true });
}
