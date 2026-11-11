import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "找不到這個頁面",
  robots: { index: false },
};

const LINKS = [
  { href: "/", label: "免費排盤" },
  { href: "/stars", label: "十四主星" },
  { href: "/palaces", label: "十二宮" },
  { href: "/method", label: "排盤說明" },
];

export default function NotFound() {
  return (
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-20 sm:px-6">
      <p className="font-serif text-sm tracking-[0.3em] text-gold">404</p>
      <h1 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">找不到這個頁面</h1>
      <p className="mt-4 max-w-[36em] leading-relaxed text-ink-soft">網址可能打錯了，或頁面已經移除。可以從這裡繼續：</p>
      <ul className="mt-6 flex flex-wrap gap-2">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-4 hover:border-accent hover:text-accent"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
