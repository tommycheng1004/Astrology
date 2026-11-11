"use client";

import { useEffect, useRef, type ReactNode } from "react";

const COMPACT_QUERY = "(max-width: 1023.98px)";

/** 判斷目前是否為手機／平板版面（與 Tailwind 的 lg 斷點一致） */
export function isCompactViewport() {
  return typeof window !== "undefined" && window.matchMedia(COMPACT_QUERY).matches;
}

/**
 * 手機版的宮位詳情：從底部滑出，拇指就能操作，不必捲動頁面去找。
 * 點背景、按 Esc 或關閉鈕都能收起。
 */
export default function PalaceSheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // 關閉後把焦點還給開啟面板的那個宮位
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !dialogRef.current) return;
      // 焦點留在面板內，不跑到被遮住的頁面
      const items = [...dialogRef.current.querySelectorAll<HTMLElement>("button, a[href], input, select, [tabindex]:not([tabindex='-1'])")].filter(
        (el) => !el.hasAttribute("disabled"),
      );
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    // 平板轉橫向或視窗拉寬成桌機版面時，面板被 CSS 隱藏，要一併關閉，否則頁面一直鎖住不能捲動
    const compact = window.matchMedia(COMPACT_QUERY);
    const onResize = () => {
      if (!compact.matches) onClose();
    };
    compact.addEventListener("change", onResize);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      compact.removeEventListener("change", onResize);
      document.body.style.overflow = overflow;
      opener?.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div aria-hidden className="absolute inset-0 bg-black/45 motion-safe:animate-[fade-in_150ms_ease-out]" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-3xl bg-surface pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl motion-safe:animate-[sheet-up_200ms_ease-out]"
      >
        {/* 標題列高度容得下關閉鈕，按鈕才不會蓋到下方內容（例如宮位的自化標籤） */}
        <div className="sticky top-0 z-10 flex h-12 items-start justify-center bg-surface pt-2.5">
          <span aria-hidden className="h-1.5 w-10 rounded-full bg-line-strong" />
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="關閉宮位詳情"
            className="absolute top-0.5 right-2 grid size-11 place-items-center rounded-full text-ink-soft hover:bg-surface-2"
          >
            <svg aria-hidden viewBox="0 0 16 16" className="size-4">
              <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
