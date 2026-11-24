import type { AdminRole, AdminRow } from "@/lib/adminTypes";
import { adminJson, auditEntry, guard, owners, reasonOf, ROLE_LABEL } from "@/lib/server/admin";
import { UID_PATTERN, type MemberDoc } from "@/lib/server/members";
import { commit, getDoc, query } from "@/lib/server/store";

type AdminDoc = { role: AdminRole; email: string; grantedBy: string; grantedAt: string };
const ASSIGNABLE: AdminRole[] = ["admin", "support", "viewer"];

export async function GET(request: Request) {
  const actor = await guard(request, "admins.manage");
  if (actor instanceof Response) return actor;
  const docs = await query<AdminDoc>({ collection: "admins", limit: 200 });
  const rows: AdminRow[] = [
    ...owners().map((email) => ({ uid: null, email, role: "owner" as const, roleLabel: ROLE_LABEL.owner, grantedBy: null, grantedAt: null })),
    ...docs.map((d) => ({ uid: d.id, email: d.data.email, role: d.data.role, roleLabel: ROLE_LABEL[d.data.role] ?? d.data.role, grantedBy: d.data.grantedBy, grantedAt: d.data.grantedAt })),
  ];
  return adminJson({ admins: rows, assignable: ASSIGNABLE.map((r) => ({ role: r, label: ROLE_LABEL[r] })) });
}

/** 指派或變更角色：{ email, role, reason }。對方必須已經用這個 Email 登入過本站（會員索引裡要有） */
export async function POST(request: Request) {
  const actor = await guard(request, "admins.manage", { write: true });
  if (actor instanceof Response) return actor;
  const body = await request.json().catch(() => null);
  const reason = reasonOf(body);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = body?.role as AdminRole;
  if (!email || !ASSIGNABLE.includes(role)) return adminJson({ error: "請填 Email 並選擇角色。" }, 400);
  if (!reason) return adminJson({ error: "請填寫指派原因（2–200 字）。" }, 400);
  if (owners().includes(email)) return adminJson({ error: "擁有者由環境變數設定，不能在後台變更。" }, 400);
  const [member] = await query<MemberDoc>({ collection: "members", where: [["email", "==", email]], limit: 2 });
  if (!member) return adminJson({ error: "找不到這個 Email。請對方先用這個 Email 登入本站一次，再回來指派。" }, 404);
  if (!member.data.verified) return adminJson({ error: "對方的 Email 尚未驗證，驗證後才能指派後台角色。" }, 400);
  const existing = await getDoc<AdminDoc>(["admins", member.id]);
  const ok = await commit([
    { op: "set", path: ["admins", member.id], fields: { role, email, grantedBy: actor.email, grantedAt: new Date() }, ...(existing ? { updateTime: existing.updateTime } : { mustExist: false }) },
    auditEntry(actor, "admin.grant", `${email}（${member.id}）`, { before: existing?.data.role ?? null, after: role }, reason),
  ]);
  if (!ok) return adminJson({ error: "資料剛被其他人更新，請重新整理後再試。" }, 409);
  return adminJson({ ok: true });
}

/** 移除角色：{ uid, reason } */
export async function DELETE(request: Request) {
  const actor = await guard(request, "admins.manage", { write: true });
  if (actor instanceof Response) return actor;
  const body = await request.json().catch(() => null);
  const reason = reasonOf(body);
  const uid = typeof body?.uid === "string" ? body.uid : "";
  if (!UID_PATTERN.test(uid)) return adminJson({ error: "找不到這位管理員。" }, 404);
  if (!reason) return adminJson({ error: "請填寫移除原因（2–200 字）。" }, 400);
  const existing = await getDoc<AdminDoc>(["admins", uid]);
  if (!existing) return adminJson({ error: "找不到這位管理員。" }, 404);
  const ok = await commit([
    { op: "delete", path: ["admins", uid] },
    auditEntry(actor, "admin.revoke", `${existing.data.email}（${uid}）`, { before: existing.data.role, after: null }, reason),
  ]);
  if (!ok) return adminJson({ error: "資料剛被其他人更新，請重新整理後再試。" }, 409);
  return adminJson({ ok: true });
}
