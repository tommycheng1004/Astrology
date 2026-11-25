/**
 * GA4 流量分析（NEXT_PUBLIC_GA_ID 沒設定就完全不載入、track() 什麼都不做）。
 *
 * 隱私原則：
 * - 分享連結把生辰放在網址 # 之後，所以每個事件都帶「去掉 # 與非白名單查詢參數」的 page_location，
 *   不讓 gtag 自己讀 location.href。GA 後台也要關掉「依瀏覽器記錄判斷網頁變更」（見 docs/analytics.md）。
 * - 事件參數只允許下面列舉的固定值，不可放姓名、生辰、命盤內容、提問文字或帳號識別碼。
 * - 關閉 Google 信號與廣告個人化，本站不做廣告追蹤。
 */

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";

/** 網址查詢參數白名單：廣告來源與流年頁入口；其餘（例如報告代碼 record）一律去掉 */
const KEEP_PARAMS = new Set(["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "liunian"]);

type ReportName = "annual" | "monthly" | "deep";

/** 全部允許送出的事件與參數。新增事件時加在這裡，型別會擋掉不在清單上的參數 */
type Events = {
  /** 排盤完成（漏斗第 1 步） */
  chart_create: { source: "form" | "share"; time_known: boolean };
  /** 打開「預覽農曆正月」 */
  report_preview: { report: "annual" };
  /** 按下報告按鈕（漏斗第 2 步）；未登入時接著會打開登入框 */
  report_start: { report: ReportName; signed_in: boolean };
  /** 報告整理完成並顯示（漏斗第 4 步） */
  report_view: { report: ReportName };
  /** 打開登入框（漏斗第 3 步之前） */
  login_open: Record<string, never>;
  /** GA4 建議事件：登入與註冊（漏斗第 3 步） */
  login: { method: "google" | "email" };
  sign_up: { method: "google" | "email" };
  chart_save: Record<string, never>;
  /** GA4 建議事件 */
  share: { method: "line" | "link" | "text" | "image"; content_type: "chart" | "persona" };
  ai_question: { suggested: boolean };
  /** 結果頁切換分頁 */
  tab_view: { tab: "chart" | "fortune" | "days" | "synastry" | "ai" };
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** 目前網址去掉 # 與非白名單查詢參數 */
export function safeLocation(href = location.href): string {
  const url = new URL(href);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) if (!KEEP_PARAMS.has(key)) url.searchParams.delete(key);
  return url.toString();
}

let started = false;

/** 建立 gtag 佇列並設定；實際的 gtag.js 由 <Analytics /> 用 next/script 載入 */
export function startAnalytics() {
  if (!GA_ID || started || typeof window === "undefined") return;
  started = true;
  window.dataLayer = window.dataLayer || [];
  // gtag.js 只認 arguments 物件，不能改成陣列
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  // 用 set 而不是寫在 config：config 的參數優先於 set，換頁後就改不掉；set 讓 GA 自動事件也用乾淨網址
  window.gtag("set", { page_location: safeLocation() });
  window.gtag("config", GA_ID, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
}

function send(name: string, params: Record<string, unknown>) {
  if (!GA_ID || typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", name, { ...params, page_location: safeLocation() });
}

/** 換頁時呼叫（App Router 的用戶端換頁不會自動送 page_view） */
export function trackPageView() {
  window.gtag?.("set", { page_location: safeLocation() });
  send("page_view", { page_title: document.title });
}

export function track<K extends keyof Events>(name: K, ...params: Events[K] extends Record<string, never> ? [] : [Events[K]]) {
  send(name, params[0] ?? {});
}
