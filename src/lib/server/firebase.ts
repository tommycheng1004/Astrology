import "server-only";
import { createHmac } from "node:crypto";
import { decodeJwt, importPKCS8, importX509, jwtVerify, SignJWT, type JWTPayload } from "jose";

/**
 * 伺服器端的 Firebase：驗證登入的 ID token、以 Firestore REST API 記錄 AI 每日用量。
 * 刻意不用 firebase-admin（連帶 gRPC 等大型依賴），只靠 jose 與 fetch，Netlify 函式小、冷啟動快。
 *
 * 環境變數：
 * - NEXT_PUBLIC_FIREBASE_PROJECT_ID：專案 ID（前後端共用）
 * - FIREBASE_CLIENT_EMAIL、FIREBASE_PRIVATE_KEY：服務帳戶，用來寫入用量（只在伺服器）
 * - 本機測試才用：FIREBASE_AUTH_EMULATOR_HOST、FIRESTORE_EMULATOR_HOST（例如 127.0.0.1:9099、127.0.0.1:8080）
 */

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
const AUTH_EMULATOR = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "";
const FIRESTORE_EMULATOR = process.env.FIRESTORE_EMULATOR_HOST ?? "";

/** 模擬器只允許本機位址，避免正式環境誤設而接受未簽章的 token */
const isLocal = (host: string) => /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host);

/** 伺服器能不能驗證登入 */
export const authConfigured = !!PROJECT_ID;
/** 伺服器能不能寫入用量 */
export const usageConfigured = !!PROJECT_ID && (isLocal(FIRESTORE_EMULATOR) || (!!process.env.FIREBASE_CLIENT_EMAIL && !!process.env.FIREBASE_PRIVATE_KEY));

// ---------- 驗證 ID token（依 Firebase 文件：以第三方 JWT 函式庫驗證） ----------

const CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
let certs: { keys: Map<string, CryptoKey>; expires: number } | null = null;

async function publicKey(kid: string | undefined) {
  if (!certs || Date.now() > certs.expires) {
    const res = await fetch(CERTS_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`無法取得 Firebase 公鑰：${res.status}`);
    const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get("cache-control") ?? "")?.[1] ?? 3600);
    const pems = (await res.json()) as Record<string, string>;
    const keys = new Map<string, CryptoKey>();
    for (const [id, pem] of Object.entries(pems)) keys.set(id, await importX509(pem, "RS256"));
    certs = { keys, expires: Date.now() + maxAge * 1000 };
  }
  const key = kid ? certs.keys.get(kid) : undefined;
  if (!key) throw new Error("找不到對應的公鑰");
  return key;
}

/** 驗證登入憑證，成功回傳 uid 與 Email 是否已驗證；憑證無效回傳 null */
export async function verifyIdToken(token: string): Promise<{ uid: string; verified: boolean } | null> {
  if (!PROJECT_ID) return null;
  const issuer = `https://securetoken.google.com/${PROJECT_ID}`;
  let payload: JWTPayload;
  try {
    if (isLocal(AUTH_EMULATOR)) {
      // 驗證模擬器發的 token 沒有簽章，只檢查內容
      payload = decodeJwt(token);
      if (payload.iss !== issuer || payload.aud !== PROJECT_ID || !payload.exp || payload.exp * 1000 < Date.now()) return null;
    } else {
      ({ payload } = await jwtVerify(token, (header) => publicKey(header.kid), { issuer, audience: PROJECT_ID, algorithms: ["RS256"] }));
    }
  } catch {
    return null;
  }
  const authTime = payload.auth_time;
  if (typeof payload.sub !== "string" || !payload.sub || typeof authTime !== "number" || authTime * 1000 > Date.now() + 60_000) return null;
  return { uid: payload.sub, verified: payload.email_verified === true };
}

// ---------- Firestore REST（以服務帳戶身分） ----------

let token: { value: string; expires: number } | null = null;

async function accessToken() {
  if (isLocal(FIRESTORE_EMULATOR)) return "owner";
  if (token && Date.now() < token.expires) return token.value;
  // Netlify 等平台的環境變數常把換行存成 \n 字面字串
  const key = await importPKCS8(process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"), "RS256");
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/datastore" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(process.env.FIREBASE_CLIENT_EMAIL!)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!res.ok) throw new Error(`服務帳戶授權失敗：${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  // 提早五分鐘換新
  token = { value: data.access_token, expires: Date.now() + (data.expires_in - 300) * 1000 };
  return token.value;
}

const documentsPath = () => `projects/${PROJECT_ID}/databases/(default)/documents`;
const apiBase = () => (isLocal(FIRESTORE_EMULATOR) ? `http://${FIRESTORE_EMULATOR}/v1` : "https://firestore.googleapis.com/v1");

/**
 * 原子性地把 usage/{id} 的 count 加上 delta，回傳加完後的值。文件不存在時自動建立。
 * expireAt 給 Firestore 的 TTL 政策自動清除舊紀錄用。
 */
async function addUsage(id: string, delta: number, expireAt: Date) {
  const res = await fetch(`${apiBase()}/${documentsPath()}:commit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      writes: [
        {
          update: { name: `${documentsPath()}/usage/${id}`, fields: { expireAt: { timestampValue: expireAt.toISOString() } } },
          updateMask: { fieldPaths: ["expireAt"] },
          updateTransforms: [{ fieldPath: "count", increment: { integerValue: String(delta) } }],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`寫入用量失敗：${res.status} ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { writeResults?: { transformResults?: { integerValue?: string }[] }[] };
  return Number(data.writeResults?.[0]?.transformResults?.[0]?.integerValue ?? NaN);
}

// ---------- AI 每日題數 ----------

const intEnv = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
};

export const DAILY_LIMIT = { guest: intEnv("AI_DAILY_GUEST", 2), member: intEnv("AI_DAILY_MEMBER", 10) };

/** 台灣日期，例如 2026-11-11；每日題數在台灣時間午夜重置 */
const taiwanDate = (now = Date.now()) => new Date(now + 8 * 3600_000).toISOString().slice(0, 10);

export type Quota = { member: boolean; limit: number; used: number; key: string };

/**
 * 先扣一題再回答：回傳扣完後的用量；超過上限時 allowed 為 false（這一題也已退回）。
 * 訪客以 IP 的雜湊計算（不存原始 IP），會員以 uid 計算。
 */
export async function takeQuestion(who: { uid: string } | { ip: string }, secret: string) {
  const member = "uid" in who;
  const limit = member ? DAILY_LIMIT.member : DAILY_LIMIT.guest;
  const date = taiwanDate();
  const subject = member ? who.uid : createHmac("sha256", secret).update(`ip:${who.ip}`).digest("base64url").slice(0, 32);
  const key = `${date}_${member ? "m" : "g"}_${subject}`;
  // 保留到後天，讓 TTL 自動刪除
  const expireAt = new Date(Date.parse(`${date}T00:00:00+08:00`) + 2 * 86400_000);
  const used = await addUsage(key, 1, expireAt);
  if (used > limit) {
    await addUsage(key, -1, expireAt).catch(() => {});
    return { allowed: false, quota: { member, limit, used: limit, key } };
  }
  return { allowed: true, quota: { member, limit, used, key } };
}

/** 沒有得到回答（出錯、被擋下）時把這一題退回 */
export async function refundQuestion(key: string) {
  const date = key.slice(0, 10);
  await addUsage(key, -1, new Date(Date.parse(`${date}T00:00:00+08:00`) + 2 * 86400_000));
}
