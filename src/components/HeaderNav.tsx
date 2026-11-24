"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

export type NavItem = { href: string; label: string; note?: string };
export type NavGroup = { title: string; items: NavItem[] };

/**
 * 頁首選單。桌機（md 以上）直接列出工具，「學紫微」收在下拉選單；手機收成「選單」按鈕，展開是完整分組清單。
 * 點選連結、按 Esc 或點選單外面都會關閉。
 */
export default function HeaderNav({ tools, learn }: { tools: NavItem[]; learn: NavGroup }) {
  const pathname = usePathname();
  const [open, setOpen] = useState<"learn" | "menu" | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const learnId = useId();
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    const onClick = (e: MouseEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(null);
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href.replace(/\/\d+$/, "")));
  const linkClass = (href: string) =>
    `flex min-h-11 items-center rounded-lg px-3 text-[15px] whitespace-nowrap transition hover:bg-surface-2 hover:text-accent ${
      active(href) ? "font-bold text-accent" : "text-ink-soft"
    }`;
  const close = () => setOpen(null);

  return (
    <div ref={rootRef} className="relative flex items-center">
      {/* 桌機 */}
      <nav aria-label="主選單" className="hidden md:block">
        <ul className="flex items-center">
          {tools.map((item) => (
            <li key={item.href}>
              <Link href={item.href} aria-current={active(item.href) ? "page" : undefined} className={linkClass(item.href)}>
                {item.label}
              </Link>
            </li>
          ))}
          <li className="relative">
            <button
              type="button"
              aria-expanded={open === "learn"}
              aria-controls={learnId}
              onClick={() => setOpen(open === "learn" ? null : "learn")}
              className={`flex min-h-11 items-center gap-1 rounded-lg px-3 text-[15px] whitespace-nowrap transition hover:bg-surface-2 hover:text-accent ${
                learn.items.some((i) => active(i.href)) ? "font-bold text-accent" : "text-ink-soft"
              }`}
            >
              {learn.title}
              <svg aria-hidden viewBox="0 0 16 16" className={`size-3.5 transition-transform ${open === "learn" ? "rotate-180" : ""}`}>
                <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
            {open === "learn" && (
              <ul id={learnId} className="absolute top-full right-0 z-50 mt-1 w-60 rounded-xl border border-line bg-surface p-1.5 shadow-lg">
                {learn.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} onClick={close} className="flex min-h-11 flex-col justify-center rounded-lg px-3 py-2 hover:bg-surface-2">
                      <span className="text-[15px] text-ink">{item.label}</span>
                      {item.note && <span className="text-xs text-muted">{item.note}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        </ul>
      </nav>

      {/* 手機 */}
      <button
        type="button"
        aria-expanded={open === "menu"}
        aria-controls={menuId}
        onClick={() => setOpen(open === "menu" ? null : "menu")}
        className="flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-[15px] text-ink-soft transition hover:bg-surface-2 hover:text-accent md:hidden"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          {open === "menu" ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
        選單
      </button>
      {open === "menu" && (
        <nav id={menuId} aria-label="主選單" className="fixed inset-x-3 top-[4.25rem] z-50 max-h-[calc(100dvh-5.5rem)] overflow-y-auto rounded-2xl border border-line bg-surface p-4 shadow-xl md:hidden">
          {[{ title: "工具", items: tools }, learn].map((group) => (
            <div key={group.title} className="mb-3 last:mb-0">
              <p className="px-3 pb-1 text-sm font-bold text-gold">{group.title}</p>
              <ul>
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={close}
                      aria-current={active(item.href) ? "page" : undefined}
                      className="flex min-h-12 flex-col justify-center rounded-lg px-3 py-1.5 hover:bg-surface-2"
                    >
                      <span className={`text-base ${active(item.href) ? "font-bold text-accent" : "text-ink"}`}>{item.label}</span>
                      {item.note && <span className="text-xs text-muted">{item.note}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      )}
    </div>
  );
}
