import "server-only";
import { randomBytes } from "node:crypto";
import { requestMember, usageConfigured, type Identity } from "@/lib/server/firebase";
import { getDoc, type Write } from "@/lib/server/store";

/**
 * 後台權限。
 *
 * 角色：
 * - owner：環境變數 ADMIN_OWNER_EMAILS 列出的 Email（需已驗證）。可以指派、移除其他管理員，無法從後台被移除。
 * - admin：營運設定、會員題數、稽核紀錄。
 * - support：查會員、調整個人題數（客服用）。
 * - viewer：只能看儀表板與會員列表。
 * 角色存在 admins/{uid}，只有伺服器寫得到（Firestore 規則全擋）。
 *
 * 每個 /api/admin 請求都重新驗證 ID token 並查角色，不靠前端隱藏按鈕。沒有權限的人一律回 404，不透露後台存在。
 * 會修改資料的操作還要求「12 小時內登入過」，並在同一筆交易寫入稽核紀錄（auditLog），改了就一定有紀錄。
 */

export const ROLES = ["owner", "admin", "support", "viewer"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABEL: Record<Role, string> = { owner: "擁有者", admin: "管理員", support: "客服", viewer: "唯讀" };

export const PERMISSIONS = {
  "dashboard.read": ["owner", "admin", "support", "viewer"],
  "members.read": ["owner", "admin", "support", "viewer"],
  "members.quota": ["owner", "admin", "support"],
  "settings.read": ["owner", "admin", "support", "viewer"],
  "settings.write": ["owner", "admin"],
  "audit.read": ["owner", "admin"],
  "admins.manage": ["owner"],
} as const satisfies Record<string, readonly Role[]>;
export type Permission = keyof typeof PERMISSIONS;

export const can = (role: Role, perm: Permission) => (PERMISSIONS[perm] as readonly Role[]).includes(role);

export type Actor = { uid: string; email: string; role: Role };

const REAUTH_MS = 12 * 3600_000;
export const owners = () =>
  (process.env.ADMIN_OWNER_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export async function roleOf(who: Identity): Promise<Role | null> {
  if (!who.verified || !who.email) return null;
  if (owners().includes(who.email)) return "owner";
  const doc = await getDoc<{ role: string }>(["admins", who.uid]);
  const role = doc?.data.role as Role | undefined;
  return role && ROLES.includes(role) && role !== "owner" ? role : null;
}

// 單一實例的記憶體頻率限制：擋住失控的腳本，不是主要防線
const hits = new Map<string, number[]>();
function tooMany(uid: string) {
  const now = Date.now();
  const recent = (hits.get(uid) ?? []).filter((t) => now - t < 600_000);
  recent.push(now);
  hits.set(uid, recent);
  if (hits.size > 500) hits.clear();
  return recent.length > 600;
}

export function adminJson(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } });
}

const notFound = () => adminJson({ error: "Not Found" }, 404);

/**
 * 驗證後台請求。通過時回傳操作者；不通過時回傳要直接送出的 Response。
 * write=true 的操作要求 12 小時內登入過，避免被偷走的長效登入狀態拿來改資料。
 */
export async function guard(request: Request, perm: Permission, { write = false } = {}): Promise<Actor | Response> {
  if (!usageConfigured) return notFound();
  const who = await requestMember(request);
  if (!who) return notFound();
  const role = await roleOf(who).catch((e) => {
    console.error("[admin] 讀取角色失敗", e);
    return null;
  });
  if (!role) return notFound();
  if (tooMany(who.uid)) return adminJson({ error: "操作太頻繁，請稍後再試。" }, 429);
  if (!can(role, perm)) return adminJson({ error: "你的角色沒有這項權限。" }, 403);
  if (write && Date.now() - who.authTime > REAUTH_MS)
    return adminJson({ error: "為了安全，修改資料前請重新登入確認身分。", code: "reauth" }, 401);
  return { uid: who.uid, email: who.email, role };
}

/** 修改原因：必填，2–200 字，會寫進稽核紀錄 */
export function reasonOf(body: unknown): string | null {
  const reason = typeof (body as { reason?: unknown })?.reason === "string" ? (body as { reason: string }).reason.trim() : "";
  return reason.length >= 2 && reason.length <= 200 ? reason : null;
}

/**
 * 稽核紀錄的寫入，與實際修改放在同一次 commit。
 * 文件 ID 以時間開頭，依 ID 排序就是時間順序；mustExist=false 保證只新增、不覆蓋。
 */
export function auditEntry(actor: Actor, action: string, target: string, change: { before: unknown; after: unknown }, reason: string): Write {
  const id = `${Date.now().toString(36).padStart(9, "0")}-${randomBytes(4).toString("hex")}`;
  return {
    op: "set",
    path: ["auditLog", id],
    mustExist: false,
    fields: {
      at: new Date(),
      actorUid: actor.uid,
      actorEmail: actor.email,
      actorRole: actor.role,
      action,
      target,
      before: JSON.stringify(change.before ?? null),
      after: JSON.stringify(change.after ?? null),
      reason,
    },
  };
}

export const ACTION_LABEL: Record<string, string> = {
  "settings.update": "修改系統設定",
  "member.quota": "調整會員每日題數",
  "admin.grant": "指派後台角色",
  "admin.revoke": "移除後台角色",
};
