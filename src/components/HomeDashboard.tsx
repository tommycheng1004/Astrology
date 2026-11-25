"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { useDailyHighlight } from "@/components/ChartHighlights";
import ReportLauncher from "@/components/ReportLauncher";
import { accountServerSnapshot, accountSnapshot, subscribeAccount } from "@/lib/account";
import { annualPreview, REPORT_YEAR } from "@/lib/annualReport";
import { buildChart, type Chart } from "@/lib/buildChart";
import { personalityHighlight } from "@/lib/chartHighlights";
import { yearGanzhi } from "@/lib/periods";
import type { SavedChart } from "@/lib/savedCharts";
import { AI_ENABLED } from "@/lib/site";
import { taisuiOf, zodiacOf } from "@/lib/taisui";
import { rocYear } from "@/lib/ziwei";

/** 從首頁打開命盤時要直接停在哪裡 */
export type HomeEntry = { view: "chart" | "fortune" | "days" | "synastry" | "ai"; today?: boolean; year?: number };

const TOOLS: { title: string; body: string; entry: HomeEntry }[] = [
  { title: "擇日", body: "挑搬家、簽約、開業的好日子", entry: { view: "days" } },
  { title: "合盤", body: "看兩個人合不合、怎麼相處", entry: { view: "synastry" } },
  ...(AI_ENABLED ? [{ title: "問 AI", body: "用你的命盤直接提問", entry: { view: "ai" as const } }] : []),
];

function birthLine(item: SavedChart) {
  const { input } = item.saved;
  const date = `${input.calendar === "lunar" ? "農曆" : ""}${rocYear(input.year)}年${input.isLeapMonth ? "閏" : ""}${input.month}月${input.day}日`;
  return [date, item.saved.timeMode === "clock" ? item.saved.clock : null, input.gender].filter(Boolean).join("・");
}

/**
 * 回訪者的首頁：先讓人看到「這是我的命盤、它說我是什麼樣的人、今天和今年怎樣」，
 * 再給明確的下一步（打開命盤、看今天、看今年、擇日／合盤／問 AI）。
 * 只用最近一張命盤；其他命盤在「我的命盤」清單（aside）點開。
 */
export default function HomeDashboard({ item, loading, onOpen, aside }: {
  item: SavedChart;
  loading: boolean;
  onOpen: (entry: HomeEntry) => void;
  aside: ReactNode;
}) {
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot, accountServerSnapshot);
  const [result, setResult] = useState<{ chart: Chart | null } | null>(null);
  useEffect(() => {
    let active = true;
    buildChart(item.saved, "main", "form").then(
      (chart) => { if (active) setResult({ chart }); },
      () => { if (active) setResult({ chart: null }); },
    );
    return () => { active = false; };
  }, [item]);

  const astrolabe = result?.chart?.astrolabe;
  const today = useDailyHighlight(astrolabe);
  const facts = useMemo(() => {
    if (!astrolabe) return null;
    const birthBranch = astrolabe.rawDates.chineseDate.yearly[1];
    const [stem, branch] = yearGanzhi(REPORT_YEAR);
    return {
      persona: personalityHighlight(astrolabe),
      year: annualPreview(astrolabe),
      ganzhi: `${stem}${branch}`,
      zodiac: zodiacOf(birthBranch),
      taisui: taisuiOf(birthBranch, branch),
    };
  }, [astrolabe]);

  const name = item.saved.input.name.trim();
  const status = !result ? "正在讀取你的命盤…" : !astrolabe ? "這張命盤無法排出，請到「我的命盤」重新打開或刪除。" : null;

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <section aria-labelledby="dash-title" className="ziwei-sky rounded-2xl p-5 text-[#f9f2ff] sm:p-7 md:col-start-1 md:row-start-1">
        <p className="text-sm font-medium text-[#e5d2f3]">{name ? `${name} 的命盤` : "我的命盤"}・{birthLine(item)}</p>
        <h2 id="dash-title" className="mt-1 font-serif text-[clamp(1.65rem,5vw,2.4rem)] leading-tight font-bold tracking-wide">
          {facts?.persona?.title ?? (name ? `${name} 的命盤` : "我的命盤")}
        </h2>
        {facts?.persona && <p className="mt-1 text-sm text-[#e5d2f3]">{facts.persona.stars}</p>}
        {status && <p role="status" className="mt-2 text-[#e5d2f3]">{status}</p>}
        <button type="button" disabled={loading} onClick={() => onOpen({ view: "chart" })} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[#f4e6fa] px-5 font-bold text-[#362044] hover:bg-white disabled:opacity-60">
          打開我的命盤 <span aria-hidden className="ml-2">→</span>
        </button>
        {today && (
          <div className="mt-5 border-t border-white/20 pt-4">
            <p className="text-sm font-medium text-[#e5d2f3]">今天 {today.date}・重點在{today.topic}</p>
            <p className="mt-1 max-w-md leading-relaxed">{today.text}</p>
            <button type="button" disabled={loading} onClick={() => onOpen({ view: "fortune", today: true })} className="-mb-2 inline-flex min-h-11 items-center text-sm font-bold text-[#f1d9ff] underline underline-offset-4 disabled:opacity-60">
              看今天運勢 <span aria-hidden className="ml-1">→</span>
            </button>
          </div>
        )}
      </section>

      {facts?.year && (
        <section aria-labelledby="dash-year" className="rounded-2xl border border-line bg-surface p-5 sm:p-6 md:col-span-2 md:row-start-2">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <div className="min-w-0 flex-1 basis-72">
              <h2 id="dash-year" className="font-serif text-xl font-bold">你的 {REPORT_YEAR} {facts.ganzhi}年</h2>
              <p className="mt-2 leading-relaxed text-ink">{facts.year.summary}</p>
              <p className="mt-2 text-sm text-ink-soft">
                <strong className="font-bold text-ink">屬{facts.zodiac}</strong>：
                {facts.taisui.length ? `${REPORT_YEAR} 年${facts.taisui.map((kind) => `${kind}太歲`).join("、")}。` : `${REPORT_YEAR} 年沒有犯太歲。`}
                <Link href={`/taisui/${REPORT_YEAR}`} className="ml-1 inline-flex min-h-11 items-center text-accent underline underline-offset-4">各生肖犯太歲</Link>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={loading} onClick={() => onOpen({ view: "fortune", year: REPORT_YEAR })} className="action-secondary">
                看 {REPORT_YEAR} 每月運勢
              </button>
              {account.enabled && (
                <ReportLauncher kind="annual" saved={item.saved}>
                  {account.user ? `完整 ${REPORT_YEAR} 報告` : "登入看完整報告"}
                </ReportLauncher>
              )}
            </div>
          </div>
        </section>
      )}

      <section aria-labelledby="dash-tools" className="md:col-span-2 md:row-start-3">
        <h2 id="dash-tools" className="mb-2 text-sm font-bold text-ink-soft">用這張命盤還可以</h2>
        <ul className={`grid gap-2 ${TOOLS.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {TOOLS.map((tool) => (
            <li key={tool.title}>
              <button
                type="button"
                disabled={loading}
                onClick={() => onOpen(tool.entry)}
                className="group flex min-h-16 w-full items-center justify-between gap-3 rounded-xl border border-line-strong bg-surface px-4 py-3 text-left transition hover:border-accent disabled:opacity-60"
              >
                <span>
                  <span className="block font-serif text-base font-bold text-ink">{tool.title}</span>
                  <span className="block text-sm text-ink-soft">{tool.body}</span>
                </span>
                <span aria-hidden className="text-accent transition group-hover:translate-x-0.5">→</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* 手機放最後（只有一張命盤時和上方大卡重複）；桌機放右上 */}
      <div className="min-w-0 md:col-start-2 md:row-start-1">{aside}</div>
    </div>
  );
}
