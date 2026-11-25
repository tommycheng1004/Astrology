"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import ReportLauncher from "@/components/ReportLauncher";
import type { ReportKind } from "@/lib/annualReport";
import { chartCaption, parseCharts, readChartsRaw, subscribeCharts } from "@/lib/savedCharts";

/**
 * 會員直接打開報告網址、但沒有指定哪一張命盤時：從「我的命盤」選一張直接產生報告。
 * 這個元件會帶進排盤設定（shareLink → ziwei），所以報告頁用 next/dynamic 在登入後才載入。
 */
export default function ReportQuickOpen({ kind }: { kind: ReportKind }) {
  const raw = useSyncExternalStore(subscribeCharts, readChartsRaw, () => null);
  const charts = useMemo(() => parseCharts(raw), [raw]);
  const [selected, setSelected] = useState("");
  const chart = charts.find((item) => item.id === selected) ?? charts[0];

  if (!chart)
    return (
      <div className="space-y-3">
        <p>報告要用一張命盤產生。先到首頁排盤，按「存到我的命盤」，再回來這裡；或排盤後直接在命盤下方的「會員功能」開啟。</p>
        <Link href="/" className="action-primary px-6">前往免費排盤</Link>
      </div>
    );

  return (
    <div className="space-y-3">
      <label className="block text-ink-soft">選擇要用的命盤
        <select value={chart.id} onChange={(e) => setSelected(e.target.value)} className="mt-1 block h-11 w-full max-w-md rounded-lg border border-line-strong bg-surface px-2 text-base text-ink">
          {charts.map((item) => <option value={item.id} key={item.id}>{item.saved.input.name || "未命名"} · {chartCaption(item.saved)}</option>)}
        </select>
      </label>
      <ReportLauncher key={`${kind}-${chart.id}`} kind={kind} saved={chart.saved}>用這張命盤開啟報告</ReportLauncher>
    </div>
  );
}
