import Link from "next/link";
import AccountButton from "@/components/AccountButton";
import HeaderNav, { type NavGroup, type NavItem } from "@/components/HeaderNav";
import { featuredYear } from "@/content/liunian";
import { FIREBASE_ENABLED } from "@/lib/firebaseConfig";
import { AI_ENABLED, SITE_NAME } from "@/lib/site";

/** 頁尾說明生辰什麼時候會送出 */
const SENDS = [FIREBASE_ENABLED && "登入會員同步命盤", AI_ENABLED && "使用「問 AI」"].filter(Boolean).join("或");

/** 工具（頁首直接列出）與學紫微（收在下拉選單）。流年、犯太歲指向建置時推薦的年份（農曆十月起推明年） */
function navGroups() {
  const year = featuredYear();
  const tools: NavItem[] = [
    { href: "/", label: "免費排盤", note: "命盤、運勢、擇日、合盤" },
    { href: `/liunian/${year}`, label: `${year} 流年`, note: `${year} 年整體運勢與四化` },
    { href: `/taisui/${year}`, label: "犯太歲", note: `${year} 年哪些生肖犯太歲` },
    ...(FIREBASE_ENABLED ? [{ href: "/account", label: "會員中心", note: "我的命盤、報告、提醒、事件定盤" }] : []),
  ];
  const learn: NavGroup = {
    title: "學紫微",
    items: [
      { href: "/stars", label: "十四主星", note: "每顆主星的個性與意義" },
      { href: "/palaces", label: "十二宮", note: "每個宮位看什麼" },
      { href: "/method", label: "排盤說明", note: "排盤規則與準確度" },
    ],
  };
  return { tools, learn };
}

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 pt-4 sm:px-6 sm:pt-5">
      <a
        href="#main"
        className="sr-only rounded-md bg-accent px-4 py-2 text-surface focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60]"
      >
        跳到主要內容
      </a>
      <Link href="/" className="flex min-h-11 min-w-11 shrink-0 items-center gap-2.5">
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
      <div className="flex items-center gap-1">
        <HeaderNav {...navGroups()} />
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
        <nav aria-label="網站導覽" className="grid grid-cols-2 gap-x-8 gap-y-4 sm:flex sm:gap-12">
          {(() => {
            const { tools, learn } = navGroups();
            return [{ title: "工具", items: tools }, { title: learn.title, items: [...learn.items, { href: "/privacy", label: "隱私權政策" }] }].map((group) => (
              <div key={group.title}>
                <p className="text-xs font-bold text-muted">{group.title}</p>
                <ul className="mt-1">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className="flex min-h-11 items-center text-ink-soft hover:text-accent">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ));
          })()}
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
              <Link href={item.path} className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-accent">
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
