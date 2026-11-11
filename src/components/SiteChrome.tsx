import Link from "next/link";
import AccountButton from "@/components/AccountButton";
import { FIREBASE_ENABLED } from "@/lib/firebaseConfig";
import { AI_ENABLED, SITE_NAME } from "@/lib/site";

/** 頁尾說明生辰什麼時候會送出 */
const SENDS = [FIREBASE_ENABLED && "登入會員同步命盤", AI_ENABLED && "使用「問 AI」"].filter(Boolean).join("或");

const NAV = [
  { href: "/stars", label: "主星", long: "十四主星" },
  { href: "/palaces", label: "十二宮", long: "十二宮" },
  { href: "/method", label: "說明", long: "排盤說明" },
];

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 pt-4 sm:px-6 sm:pt-5">
      <a
        href="#main"
        className="sr-only rounded-md bg-accent px-4 py-2 text-surface focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60]"
      >
        跳到主要內容
      </a>
      <Link href="/" className="flex min-h-11 shrink-0 items-center gap-2.5">
        <span
          aria-hidden
          className="grid size-9 place-items-center rounded-md bg-accent font-serif text-[13px] leading-[1.05] font-bold text-surface shadow-sm"
        >
          <span className="vertical">紫微</span>
        </span>
        {/* 360px 以下的窄螢幕只留方形標誌，網站名稱改成只給螢幕閱讀器，頁首才放得下會員按鈕 */}
        <span className="sr-only font-serif font-bold tracking-[0.1em] whitespace-nowrap min-[360px]:not-sr-only min-[360px]:text-lg sm:tracking-[0.2em]">
          {SITE_NAME}
        </span>
      </Link>
      <div className="flex items-center">
        <nav aria-label="主選單">
          <ul className="flex items-center">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-11 items-center rounded-lg px-1.5 text-[15px] whitespace-nowrap text-ink-soft transition hover:bg-surface-2 hover:text-accent min-[360px]:px-2 sm:px-3"
                >
                  <span className="sm:hidden">{item.label}</span>
                  <span className="hidden sm:inline">{item.long}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <AccountButton />
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 text-sm sm:grid-cols-[1fr_auto] sm:px-6">
        <div className="space-y-2 text-xs text-muted">
          <p className="font-serif text-base font-bold text-ink">{SITE_NAME}</p>
          <p>命理內容僅供參考，不構成任何醫療、法律、投資等專業建議。</p>
          <p>
            排盤引擎：iztro（MIT License）・排盤在你的瀏覽器中計算，{SENDS ? `${SENDS}時才會送出生辰` : "生辰資料不會上傳"}。
          </p>
        </div>
        <nav aria-label="網站導覽">
          <ul className="grid grid-cols-2 gap-x-6 sm:grid-cols-1">
            {[{ href: "/", long: "免費排盤" }, ...NAV, { href: "/privacy", long: "隱私權政策" }].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="flex min-h-11 items-center text-ink-soft hover:text-accent">
                  {item.long}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}

export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <nav aria-label="麵包屑" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-x-1.5">
        {items.map((item, i) => (
          <li key={item.path} className="flex items-center gap-x-1.5">
            {i > 0 && <span aria-hidden>›</span>}
            {i === items.length - 1 ? (
              <span aria-current="page" className="text-ink-soft">
                {item.name}
              </span>
            ) : (
              <Link href={item.path} className="inline-flex min-h-11 items-center hover:text-accent">
                {item.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** 內容頁底部的排盤引導 */
export function ChartCta({ title, body }: { title: string; body: string }) {
  return (
    <aside aria-label="免費排盤" className="rounded-2xl border border-accent/30 bg-accent-soft p-6 sm:p-8">
      <p className="font-serif text-xl font-bold">{title}</p>
      <p className="mt-2 max-w-[38em] leading-relaxed text-ink-soft">{body}</p>
      <Link
        href="/"
        className="mt-5 inline-flex h-12 items-center rounded-xl bg-accent px-6 font-serif font-bold tracking-[0.2em] text-surface transition hover:brightness-110"
      >
        免費排盤
      </Link>
    </aside>
  );
}
