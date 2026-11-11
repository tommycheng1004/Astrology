"use client";

import { useState } from "react";
import { overallOf, type Grade, type Insight, type Reading } from "@/lib/fortune";

/** 等級配色：好的偏綠、普通中性、差的偏橘紅；一律搭配文字，不單靠顏色 */
export const GRADE_BAR: Record<Grade, string> = {
  極佳: "bg-lu",
  良好: "bg-lu/55",
  平穩: "bg-line-strong",
  稍弱: "bg-quan/70",
  需留意: "bg-ji",
};

export const GRADE_BADGE: Record<Grade, string> = {
  極佳: "bg-lu/15 text-lu",
  良好: "bg-lu/10 text-lu",
  平穩: "bg-surface-2 text-ink-soft",
  稍弱: "bg-quan/10 text-quan",
  需留意: "bg-ji/10 text-ji",
};

const OVERALL_PHRASE: Record<Grade, string> = {
  極佳: "整體很旺",
  良好: "整體不錯",
  平穩: "整體平穩",
  稍弱: "整體偏弱",
  需留意: "整體要多留意",
};

const SHORT: Record<string, string> = { career: "事業", wealth: "財運", love: "感情", health: "健康", social: "人際" };

/** 一句話總結：最旺與最弱的一運 */
export function headlineOf(results: Reading[], kind: "natal" | "period") {
  const sorted = [...results].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const overall = OVERALL_PHRASE[overallOf(results).grade];
  if (best.score - worst.score < 12)
    return kind === "natal" ? "五運發展平均，沒有特別突出或吃虧的地方。" : `${overall}，五運起伏不大。`;
  return kind === "natal"
    ? `${SHORT[best.key]}是你的強項，${SHORT[worst.key]}比較需要用心經營。`
    : `${overall}，${best.label}最旺，${worst.label}要多留意。`;
}

type Props = {
  results: Reading[];
  onSelectPalace: (index: number) => void;
  palaceVerb?: string;
};

export default function FortuneList({ results, onSelectPalace, palaceVerb = "" }: Props) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const allOpen = open.size === results.length;

  function toggle(key: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(allOpen ? new Set() : new Set(results.map((r) => r.key)))}
          className="min-h-11 px-2 text-sm text-muted underline-offset-4 transition hover:text-accent hover:underline"
        >
          {allOpen ? "全部收合" : "全部展開"}
        </button>
      </div>
      <ul className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {results.map((r) => {
          const expanded = open.has(r.key);
          return (
            <li key={r.key}>
              <button
                type="button"
                onClick={() => toggle(r.key)}
                aria-expanded={expanded}
                aria-controls={`fortune-${r.key}`}
                className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 px-5 py-4 text-left transition hover:bg-surface-2/50 sm:px-6"
              >
                <span className="flex items-center gap-3">
                  <span className="font-serif text-lg font-bold">{r.label}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${GRADE_BADGE[r.level]}`}>{r.level}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-surface-2 sm:block" aria-hidden>
                    <span className={`block h-full rounded-full ${GRADE_BAR[r.level]}`} style={{ width: `${r.score}%` }} />
                  </span>
                  <Chevron open={expanded} />
                </span>
                <span className="col-span-2 max-w-[40em] text-base leading-relaxed text-ink-soft">{r.summary}</span>
              </button>

              {expanded && (
                <div id={`fortune-${r.key}`} className="border-t border-line/60 bg-paper/40 px-5 pt-4 pb-5 sm:px-6">
                  <ul className="max-w-[42em] space-y-3">
                    {r.insights.map((insight, i) => (
                      <InsightItem key={i} insight={insight} />
                    ))}
                  </ul>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() => onSelectPalace(r.palaceIndex)}
                      className="inline-flex min-h-11 items-center text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
                    >
                      在命盤上看{palaceVerb}{r.palaceLabel.split("・")[0]}
                    </button>
                    <span className="text-xs text-muted tabular-nums">指數 {r.score}</span>
                  </div>
                  {r.key === "health" && (
                    <p className="mt-3 text-xs text-muted">健康分析僅為命理參考，身體不適請諮詢專業醫師。</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const TONE_MARK: Record<Insight["tone"], { symbol: string; label: string; className: string }> = {
  good: { symbol: "▲", label: "有利", className: "text-[10px] text-lu" },
  bad: { symbol: "▼", label: "留意", className: "text-[10px] text-ji" },
  neutral: { symbol: "●", label: "說明", className: "text-[7px] text-muted" },
};

function InsightItem({ insight }: { insight: Insight }) {
  const mark = TONE_MARK[insight.tone];
  return (
    <li className="grid grid-cols-[1rem_1fr] items-baseline gap-1.5 text-base leading-[1.8] text-ink-soft">
      <span className={`text-center ${mark.className}`}>
        <span aria-hidden>{mark.symbol}</span>
        <span className="sr-only">{mark.label}：</span>
      </span>
      <span>{insight.text}</span>
    </li>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={`size-4 text-muted transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
