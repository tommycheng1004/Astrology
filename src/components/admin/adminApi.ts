import { currentIdToken, reauthenticate } from "@/lib/account";

/** 後台 API 錯誤；reauth=true 代表要重新登入確認身分才能修改資料 */
export class AdminError extends Error {
  constructor(message: string, readonly status: number, readonly reauth = false) {
    super(message);
  }
}

/** 呼叫 /api/admin/*：自動帶登入憑證，錯誤統一轉成 AdminError */
export async function adminFetch<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const token = await currentIdToken();
  if (!token) throw new AdminError("請先登入。", 401);
  const res = await fetch(`/api/admin/${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Bearer ${token}`, ...(init?.body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
  if (!res.ok) {
    const message = res.status === 404 && data.error === "Not Found" ? "這個帳號沒有後台權限。" : data.error || `發生錯誤（${res.status}）`;
    throw new AdminError(message, res.status, data.code === "reauth");
  }
  return data as T;
}

/** 修改資料用：遇到需要重新登入時，先重新登入再自動重試一次 */
export async function adminWrite<T>(path: string, init: { method: string; body: unknown }): Promise<T> {
  try {
    return await adminFetch<T>(path, init);
  } catch (e) {
    if (!(e instanceof AdminError) || !e.reauth) throw e;
    const ok = await reauthenticate().catch(() => false);
    if (!ok) throw new AdminError("為了安全，修改資料前請登出後重新登入。", 401);
    return adminFetch<T>(path, init);
  }
}

const DATE_TIME = new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export const formatTime = (iso: string | null | undefined) => (iso ? DATE_TIME.format(new Date(iso)) : "—");

export const providerLabel = (p: string) => (p === "google.com" ? "Google" : p === "password" ? "Email" : p || "—");
