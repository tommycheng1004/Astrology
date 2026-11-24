import "server-only";
import { DAILY_LIMIT, taiwanDate, usageConfigured, type Identity } from "@/lib/server/firebase";
import type { MemberRow } from "@/lib/adminTypes";
import { commit, getDoc, type Doc } from "@/lib/server/store";

/**
 * 會員索引與線上設定（後台可修改，不必重新部署）。
 *
 * members/{uid}：會員第一次使用時由伺服器建立，只記帳號資訊與使用時間，不存生辰、命盤或提問內容。
 *   因為服務帳戶刻意沒有 Firebase Authentication 管理權限（無法列出所有帳號），後台查會員靠這份索引。
 * config/app：AI 開關與每日題數。沒有這份文件時用環境變數 AI_DAILY_GUEST／AI_DAILY_MEMBER 的值。
 */

export type MemberDoc = {
  email: string;
  name: string;
  provider: string;
  verified: boolean;
  firstSeen: string;
  lastSeen: string;
  /** 個人每日 AI 題數；null 代表沿用全站設定 */
  dailyLimit: number | null;
};

export const UID_PATTERN = /^[A-Za-z0-9_-]{6,128}$/;

export const toRow = (d: Doc<MemberDoc>): MemberRow => ({
  uid: d.id,
  email: d.data.email ?? "",
  name: d.data.name ?? "",
  provider: d.data.provider ?? "",
  verified: !!d.data.verified,
  firstSeen: d.data.firstSeen,
  lastSeen: d.data.lastSeen,
  dailyLimit: d.data.dailyLimit ?? null,
});

export async function touchMember(who: Identity) {
  const path = ["members", who.uid];
  const now = new Date();
  const profile = { email: who.email, name: who.name, provider: who.provider, verified: who.verified, lastSeen: now };
  const existing = await getDoc<MemberDoc>(path);
  if (!existing) {
    const created = await commit([
      { op: "set", path, fields: { ...profile, firstSeen: now, dailyLimit: null }, mustExist: false },
      { op: "increment", path: ["stats", taiwanDate()], field: "newMembers", by: 1 },
    ]);
    if (created) return;
  }
  await commit([{ op: "set", path, fields: profile }]);
}

export async function memberDailyLimit(uid: string) {
  if (!usageConfigured) return null;
  try {
    return (await getDoc<MemberDoc>(["members", uid]))?.data.dailyLimit ?? null;
  } catch (e) {
    console.error("[members] 讀取個人題數失敗", e);
    return null;
  }
}

// ---------- 線上設定 ----------

export type AppConfig = {
  aiEnabled: boolean;
  dailyGuest: number;
  dailyMember: number;
  updatedAt: string | null;
  updatedBy: string | null;
};

export const CONFIG_DEFAULTS: AppConfig = { aiEnabled: true, dailyGuest: DAILY_LIMIT.guest, dailyMember: DAILY_LIMIT.member, updatedAt: null, updatedBy: null };
export const CONFIG_PATH = ["config", "app"];
const CACHE_MS = 30_000;
let cached: { value: AppConfig; at: number } | null = null;

/** 讀線上設定（同一個伺服器實例快取 30 秒）。資料庫出錯時用預設值，不讓後台問題擋住前台 */
export async function appConfig(): Promise<AppConfig> {
  if (!usageConfigured) return CONFIG_DEFAULTS;
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  try {
    const doc = await getDoc<Partial<AppConfig>>(CONFIG_PATH);
    const value = { ...CONFIG_DEFAULTS, ...doc?.data };
    cached = { value, at: Date.now() };
    return value;
  } catch (e) {
    console.error("[config] 讀取設定失敗，改用預設值", e);
    return CONFIG_DEFAULTS;
  }
}

export function forgetConfig() {
  cached = null;
}
