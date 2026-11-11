/**
 * 前端的 Firebase 設定。這些值會寫進網頁（Firebase 的設計就是公開的），
 * 安全性靠 Firestore 安全規則（firestore.rules）與 Firebase 後台的授權網域，不靠隱藏金鑰。
 */
export const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

/** 四個值都有才開啟會員功能；沒設定時網站照舊運作，只是沒有登入 */
export const FIREBASE_ENABLED = Object.values(FIREBASE_CONFIG).every(Boolean);

/** 本機開發連到 Firebase 模擬器（firebase emulators:start）。正式環境不要設定 */
export const FIREBASE_EMULATOR = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === "1";
