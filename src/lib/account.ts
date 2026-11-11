import type { FirebaseApp } from "firebase/app";
import type { Auth, User } from "firebase/auth";
import { FIREBASE_CONFIG, FIREBASE_EMULATOR, FIREBASE_ENABLED } from "@/lib/firebaseConfig";
import { clearCharts } from "@/lib/savedCharts";

/**
 * 會員登入：Google 帳號，或 Email＋密碼註冊。Firebase 的程式約 100 KB，只在需要時載入：
 * 使用者打開登入視窗，或之前登入過（瀏覽器記了 HINT_KEY）才載入，沒登入過的人首頁不受影響。
 */

export type AccountUser = {
  uid: string;
  name: string;
  email: string;
  photo: string | null;
  /** Email 是否驗證過（Google 帳號一律已驗證）。未驗證的帳號，AI 題數與訪客相同 */
  verified: boolean;
  /** 用 Email＋密碼註冊的帳號（可以重寄驗證信、改密碼） */
  password: boolean;
};
export type SyncStatus = "idle" | "syncing" | "done" | "error";
export type AccountState = {
  /** 會員功能有沒有設定（沒設 Firebase 時整個隱藏） */
  enabled: boolean;
  /** Firebase 已載入並確認過登入狀態 */
  ready: boolean;
  user: AccountUser | null;
  sync: SyncStatus;
  syncedCount: number;
};

const HINT_KEY = "ziwei:signed-in";
const OPEN_EVENT = "ziwei:open-account";

const INITIAL: AccountState = { enabled: FIREBASE_ENABLED, ready: false, user: null, sync: "idle", syncedCount: 0 };
let state = INITIAL;
const listeners = new Set<() => void>();

function set(patch: Partial<AccountState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function subscribeAccount(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export const accountSnapshot = () => state;
export const accountServerSnapshot = () => INITIAL;

type Engine = { app: FirebaseApp; auth: Auth; mod: typeof import("firebase/auth") };
let engine: Promise<Engine> | null = null;

/** 載入 Firebase 並開始監聽登入狀態（重複呼叫只會載入一次） */
export function loadAccount(): Promise<Engine> {
  if (!FIREBASE_ENABLED) return Promise.reject(new Error("會員功能未設定"));
  engine ??= (async () => {
    const [{ initializeApp, getApps }, mod] = await Promise.all([import("firebase/app"), import("firebase/auth")]);
    const app = getApps()[0] ?? initializeApp(FIREBASE_CONFIG);
    const auth = mod.getAuth(app);
    auth.languageCode = "zh-TW";
    if (FIREBASE_EMULATOR) {
      mod.connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
      // 只在模擬器建置才有：自動化測試用假的 Google 帳號登入（正式建置時這段會被移除）
      (window as unknown as Record<string, unknown>).__ziweiTestSignIn = (sub: string, email: string) =>
        mod.signInWithCredential(auth, mod.GoogleAuthProvider.credential(JSON.stringify({ sub, email, email_verified: true })));
    }
    mod.onAuthStateChanged(auth, (user) => void handleUser(user, app));
    await auth.authStateReady();
    return { app, auth, mod };
  })();
  engine.catch(() => {
    engine = null;
  });
  return engine;
}

async function handleUser(user: User | null, app: FirebaseApp) {
  if (!user) {
    try {
      localStorage.removeItem(HINT_KEY);
    } catch {}
    const { stopCloudSync } = await import("@/lib/cloudCharts");
    stopCloudSync();
    set({ ready: true, user: null, sync: "idle", syncedCount: 0 });
    return;
  }
  try {
    localStorage.setItem(HINT_KEY, "1");
  } catch {}
  set({ ready: true, user: toAccountUser(user), sync: "syncing" });
  try {
    const { startCloudSync } = await import("@/lib/cloudCharts");
    set({ sync: "done", syncedCount: await startCloudSync(app, user.uid) });
  } catch (e) {
    console.warn("命盤同步失敗", e);
    set({ sync: "error" });
  }
}

function toAccountUser(user: User): AccountUser {
  return {
    uid: user.uid,
    name: user.displayName ?? "",
    email: user.email ?? "",
    photo: user.photoURL,
    verified: user.emailVerified,
    password: user.providerData.some((p) => p.providerId === "password"),
  };
}

/** 之前登入過的瀏覽器，開頁時自動恢復登入狀態 */
export function restoreAccount() {
  if (!FIREBASE_ENABLED) return;
  let hinted = false;
  try {
    hinted = localStorage.getItem(HINT_KEY) === "1";
  } catch {}
  if (hinted) loadAccount().catch(() => set({ ready: true }));
  else set({ ready: true });
}

/**
 * Google 登入。要在使用者點擊的當下呼叫，瀏覽器才不會擋下彈出視窗，
 * 所以 Firebase 必須先載入好（打開登入視窗時就開始載入）。
 */
export async function signInWithGoogle(): Promise<string | null> {
  const { auth, mod } = await loadAccount();
  try {
    const provider = new mod.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await mod.signInWithPopup(auth, provider);
    return null;
  } catch (e) {
    const code = (e as { code?: string }).code ?? "";
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return null;
    if (code === "auth/popup-blocked") return "瀏覽器擋下了登入視窗，請允許彈出視窗後再試一次。";
    if (code === "auth/network-request-failed") return "連線失敗，請確認網路後再試一次。";
    if (code === "auth/unauthorized-domain") return "這個網址還不能登入（尚未加入 Firebase 授權網域）。";
    console.warn("登入失敗", e);
    return "登入失敗，請稍後再試。";
  }
}

/** Firebase 錯誤代碼轉成給使用者看的說明 */
function authMessage(e: unknown) {
  const code = (e as { code?: string }).code ?? "";
  switch (code) {
    case "auth/email-already-in-use":
      return "這個 Email 已經註冊過了，請直接登入。";
    case "auth/invalid-email":
      return "Email 格式不正確。";
    case "auth/weak-password":
    case "auth/password-does-not-meet-requirements":
      return "密碼太簡單了，請至少 8 個字元並混合英文與數字。";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-login-credentials":
      return "Email 或密碼不正確。";
    case "auth/user-disabled":
      return "這個帳號已停用。";
    case "auth/too-many-requests":
      return "嘗試太多次了，請過幾分鐘再試。";
    case "auth/network-request-failed":
      return "連線失敗，請確認網路後再試一次。";
    case "auth/operation-not-allowed":
      return "Email 註冊尚未開放。";
    default:
      console.warn("帳號操作失敗", e);
      return "操作失敗，請稍後再試。";
  }
}

/** 驗證信、重設密碼信點完後回到本站 */
const continueUrl = () => ({ url: `${location.origin}/` });

/** Email 註冊：建立帳號、寫入名稱、寄出驗證信。成功回傳 null，失敗回傳錯誤說明 */
export async function signUpWithEmail(name: string, email: string, password: string): Promise<string | null> {
  const { auth, mod } = await loadAccount();
  try {
    const { user } = await mod.createUserWithEmailAndPassword(auth, email.trim(), password);
    if (name.trim()) await mod.updateProfile(user, { displayName: name.trim().slice(0, 20) });
    await mod.sendEmailVerification(user, continueUrl()).catch((e) => console.warn("驗證信寄送失敗", e));
    set({ user: toAccountUser(user) });
    return null;
  } catch (e) {
    return authMessage(e);
  }
}

export async function signInWithEmail(email: string, password: string): Promise<string | null> {
  const { auth, mod } = await loadAccount();
  try {
    await mod.signInWithEmailAndPassword(auth, email.trim(), password);
    return null;
  } catch (e) {
    return authMessage(e);
  }
}

/** 忘記密碼：寄出重設密碼的信。為了不洩漏哪些 Email 註冊過，不論有沒有這個帳號都顯示已寄出 */
export async function sendPasswordReset(email: string): Promise<string | null> {
  const { auth, mod } = await loadAccount();
  try {
    await mod.sendPasswordResetEmail(auth, email.trim(), continueUrl());
    return null;
  } catch (e) {
    const code = (e as { code?: string }).code ?? "";
    return code === "auth/user-not-found" ? null : authMessage(e);
  }
}

export async function resendVerification(): Promise<string | null> {
  const { auth, mod } = await loadAccount();
  if (!auth.currentUser) return "請先登入。";
  try {
    await mod.sendEmailVerification(auth.currentUser, continueUrl());
    return null;
  } catch (e) {
    return authMessage(e);
  }
}

/** 使用者在信裡點了驗證連結之後，重新讀取帳號狀態並換一張新的登入憑證（裡面才會有已驗證的標記） */
export async function refreshVerification() {
  const { auth } = await loadAccount();
  const user = auth.currentUser;
  if (!user) return false;
  await user.reload();
  await user.getIdToken(true);
  set({ user: toAccountUser(user) });
  return user.emailVerified;
}

/** 登出：這台裝置上的命盤一併清除（資料仍在帳號裡），共用電腦也不會留下別人的生辰 */
export async function signOutAccount() {
  const { auth, mod } = await loadAccount();
  const { stopCloudSync } = await import("@/lib/cloudCharts");
  stopCloudSync();
  clearCharts();
  await mod.signOut(auth);
}

/** 目前登入者的 ID token（呼叫 AI 時帶給伺服器）；沒登入回傳 null */
export async function currentIdToken(forceRefresh = false): Promise<string | null> {
  if (!state.user || !engine) return null;
  const { auth } = await engine;
  return auth.currentUser ? auth.currentUser.getIdToken(forceRefresh) : null;
}

/** 從網站其他地方（例如 AI 額度用完）打開登入視窗 */
export function openAccountDialog() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}
export const ACCOUNT_OPEN_EVENT = OPEN_EVENT;

/** LINE、Facebook、Instagram 的內建瀏覽器：Google 不允許在這些 App 內登入（disallowed_useragent） */
export function isInAppBrowser() {
  return /\bLine\/\d|FBAN|FBAV|Instagram/.test(navigator.userAgent);
}
