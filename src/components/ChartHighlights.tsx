"use client";

import { useEffect, useState } from "react";
import { dailyHighlight, personalityHighlight, yearHighlight } from "@/lib/chartHighlights";
import type { Chart } from "@/lib/buildChart";

export function useDailyHighlight(astrolabe: Chart["astrolabe"] | undefined) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!astrolabe) return;
    const refresh = () => setNow(new Date());
    const timer = setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [astrolabe]);
  return astrolabe ? dailyHighlight(astrolabe, now) : null;
}

export default function ChartHighlights({ chart, onToday }: { chart: Chart; onToday: () => void }) {
  const personality = personalityHighlight(chart.astrolabe);
  const year = yearHighlight(chart.astrolabe, chart.now.year);
  const today = useDailyHighlight(chart.astrolabe);
  return (
    <section aria-labelledby="personality-heading" className="ziwei-sky overflow-hidden rounded-2xl px-5 py-5 text-[#f9f2ff] motion-safe:animate-[summary-enter_220ms_ease-out] sm:px-8 sm:py-7">
      <div className="relative max-w-[36rem]">
        <p className="text-sm font-medium text-[#e5d2f3]">{personality?.stars || "你的命盤個性"}</p>
        <h2 id="personality-heading" className="mt-1 font-serif text-[clamp(1.65rem,5vw,2.75rem)] leading-tight font-bold tracking-wide">
          {personality?.title || "從命宮認識自己"}
        </h2>
        {personality && <p className="mt-2 max-w-[30em] text-[15px] leading-relaxed text-[#f2e9fa] sm:text-base">{personality.sentence}</p>}
      </div>
      <div className="relative mt-5 grid gap-x-8 gap-y-3 border-t border-[#cdb7e4]/30 pt-4 sm:grid-cols-2">
        <div>
          <p className="text-sm font-bold text-[#e5d2f3]">今年重點{year && <span className="font-normal"> · {year.topic}</span>}</p>
          <p className="mt-1 text-sm leading-relaxed">{year?.text ?? "今年超出這張命盤的可推算期間。"}</p>
        </div>
        <div>
          <p className="text-sm font-bold text-[#e5d2f3]">今天提醒{today && <span className="font-normal"> · {today.date} {today.topic}</span>}</p>
          <p className="mt-1 text-sm leading-relaxed">{today?.text ?? "今日超出這張命盤的可推算期間。"}</p>
          {today && <button type="button" onClick={onToday} className="-mb-2 inline-flex min-h-11 items-center text-sm font-bold text-[#f1d9ff] underline underline-offset-4">查看今天運勢 <span aria-hidden className="ml-1">↗</span></button>}
        </div>
      </div>
    </section>
  );
}
