"use client";

import { useEffect, useState } from "react";
import { useDailyHighlight } from "@/components/ChartHighlights";
import { buildChart, type Chart } from "@/lib/buildChart";
import { chartCaption, type SavedChart } from "@/lib/savedCharts";

export default function TodayOverview({ item, loading, onOpen }: {
  item: SavedChart;
  loading: boolean;
  onOpen: () => void;
}) {
  const [result, setResult] = useState<{ chart: Chart | null } | null>(null);
  useEffect(() => {
    let active = true;
    buildChart(item.saved, "main", "form").then(
      (chart) => { if (active) setResult({ chart }); },
      () => { if (active) setResult({ chart: null }); },
    );
    return () => { active = false; };
  }, [item]);

  const today = useDailyHighlight(result?.chart?.astrolabe);

  return (
    <section aria-labelledby="today-title" className="ziwei-sky rounded-2xl p-5 text-[#f9f2ff] sm:p-7">
      <p className="text-sm font-medium text-[#e5d2f3]">{item.saved.input.name || chartCaption(item.saved)}{today && ` · ${today.date}`}</p>
      <h2 id="today-title" className="mt-1 font-serif text-3xl font-bold">今日運勢</h2>
      <p className="mt-2 max-w-sm leading-relaxed" role="status">
        {today?.text ?? (!result ? "正在讀取你的命盤…" : "今日超出這張命盤的可推算期間。")}
      </p>
      {today && <button type="button" disabled={loading} className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-[#f4e6fa] px-4 text-sm font-bold text-[#362044] hover:bg-white disabled:opacity-60" onClick={onOpen}>查看今天運勢 <span className="ml-2" aria-hidden>↗</span></button>}
    </section>
  );
}
