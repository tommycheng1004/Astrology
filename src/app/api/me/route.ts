import { roleOf } from "@/lib/server/admin";
import { privateJson, requestMember, usageConfigured } from "@/lib/server/firebase";
import { touchMember } from "@/lib/server/members";

/**
 * 會員登入後呼叫一次（前端每 6 小時最多一次）：更新會員索引的最近使用時間，
 * 並告訴前端這個帳號有沒有後台權限（只用來顯示「管理後台」連結，真正的權限每次由後台 API 檢查）。
 */
export async function POST(request: Request) {
  const who = await requestMember(request);
  if (!who) return privateJson({ error: "請先登入會員。" }, 401);
  if (!usageConfigured) return privateJson({ admin: false });
  await touchMember(who).catch((e) => console.error("[me] 更新會員索引失敗", e));
  const role = await roleOf(who).catch(() => null);
  return privateJson({ admin: !!role });
}
