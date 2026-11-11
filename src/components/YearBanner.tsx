"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { featuredYear, liunianInfo } from "@/content/liunian";

const noSubscribe = () => () => {};

/**
 * 首頁的流年入口。年份在瀏覽器依當天日期決定（農曆十月起推明年），
 * 網站久未重新部署也不會停在舊的一年；超出建置時產生的流年頁範圍時，停在最後一頁。
 */
export default function YearBanner({ buildYear, years }: { buildYear: number; years: number[] }) {
  const year = useSyncExternalStore(
    noSubscribe,
    () => Math.min(Math.max(featuredYear(), years[0]), years[years.length - 1]),
    () => buildYear,
  );
  const info = liunianInfo(year);
  return (
    <Link
      href={`/liunian/${year}`}
      className="group mt-7 flex min-h-11 items-center justify-between gap-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 transition hover:border-gold"
    >
      <span>
        <span className="block font-serif text-base font-bold text-ink">
          {year} {info.ganzhi}年運勢
        </span>
        <span className="block text-sm text-ink-soft">
          犯太歲生肖：{info.taisui.map((t) => `屬${t.zodiac}`).join("、")}・流年四化
        </span>
      </span>
      <span aria-hidden className="text-gold transition group-hover:translate-x-0.5">
        →
      </span>
    </Link>
  );
}
