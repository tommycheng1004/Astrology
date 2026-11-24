"use client";

import { useState } from "react";
import TimeComparison from "@/components/TimeComparison";
import { slotName, type ResolvedBirth } from "@/lib/birthtime";
import type { Chart } from "@/lib/buildChart";
import { timeComparisonFacts, type TimeComparisonFacts } from "@/lib/timeComparison";
import { computeAstrolabe } from "@/lib/ziwei";

type Props = {
  chart: Chart;
  alt: NonNullable<ResolvedBirth["alt"]>;
  loading: boolean;
  onSwitch: () => void;
};

export default function BoundaryComparison({ chart, alt, loading, onSwitch }: Props) {
  const [otherFacts, setOtherFacts] = useState<TimeComparisonFacts | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const isAlt = chart.variant === "alt";
  const other = isAlt ? chart.resolved : alt;
  const mainSlot = slotName(chart.resolved.timeIndex);
  const altSlot = slotName(alt.timeIndex);

  async function loadOther() {
    if (otherFacts || pending) return;
    setPending(true);
    setError(false);
    try {
      setOtherFacts(timeComparisonFacts(await computeAstrolabe(other, chart.input.gender)));
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  const currentFacts = otherFacts && timeComparisonFacts(chart.astrolabe);
  return (
    <section aria-label="出生時間交界" className="rounded-xl border border-gold/40 bg-surface px-4 py-3 text-sm sm:px-5">
      <h2 className="font-serif text-lg font-bold">出生時間有兩種排法</h2>
      <p className="mt-1 leading-relaxed text-ink-soft">
        {alt.reason === "dst"
          ? "出生當天調整了夏令時間，依兩種鐘點解釋各排一盤。"
          : alt.minutes === 0 ? "校正後的出生時間就在時辰交界。" : `校正後的出生時間距離時辰交界 ${alt.minutes} 分鐘。`}
        目前顯示{isAlt ? altSlot : mainSlot}命盤。
      </p>
      <details onToggle={(e) => { if (e.currentTarget.open) void loadOther(); }}>
        <summary className="min-h-11 cursor-pointer py-3 font-medium text-accent">比對兩個時辰的盤面</summary>
        {chart.resolved.notes.length > 0 && <ul className="mb-2 list-disc space-y-1 pl-5 text-ink-soft">
          {chart.resolved.notes.map((note) => <li key={note}>{note}</li>)}
        </ul>}
        {otherFacts && currentFacts && <TimeComparison
          first={{ label: mainSlot, facts: isAlt ? otherFacts : currentFacts }}
          second={{ label: altSlot, facts: isAlt ? currentFacts : otherFacts }}
        />}
        {pending && <p role="status">正在計算另一張命盤…</p>}
        {error && <p role="alert">另一張命盤暫時無法載入。<button type="button" className="action-text" onClick={loadOther}>重試</button></p>}
      </details>
      <button type="button" disabled={loading} onClick={onSwitch} className="action-secondary">
        {isAlt ? `回到${mainSlot}命盤` : `改看${altSlot}命盤`}
      </button>
    </section>
  );
}
