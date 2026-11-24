"use client";

import dynamic from "next/dynamic";
import { useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import BoundaryComparison from "@/components/BoundaryComparison";
import ChartHighlights from "@/components/ChartHighlights";
import ChartShare from "@/components/ChartShare";
import ChartReports from "@/components/ChartReports";
import ChartBoard from "@/components/ChartBoard";
import DayPicker from "@/components/DayPicker";
import FortuneExplorer from "@/components/FortuneExplorer";
import NatalReport from "@/components/NatalReport";
import PalaceDetail from "@/components/PalaceDetail";
import PalaceSheet, { isCompactViewport } from "@/components/PalaceSheet";
import Synastry from "@/components/Synastry";
import { PLACES, slotName } from "@/lib/birthtime";
import type { Chart } from "@/lib/buildChart";
import { nowSelection } from "@/lib/periods";
import { chartId, type SavedChart } from "@/lib/savedCharts";
import { formatBirthSummary, MUTAGEN_STYLE, palaceTitle, rocYear, TIME_SLOTS } from "@/lib/ziwei";

type View = "chart" | "fortune" | "days" | "synastry" | "ai";

/** AI 問答以環境變數開關，關閉時不顯示分頁，也不載入相關程式 */
const AI_ENABLED = process.env.NEXT_PUBLIC_AI_ENABLED === "1";
const AiChat = dynamic(() => import("@/components/AiChat"));

const VIEWS: { id: View; title: string; sub: string }[] = [
  { id: "chart", title: "命盤", sub: "格局、性格、十二宮" },
  { id: "fortune", title: "運勢", sub: "大運到時運" },
  { id: "days", title: "擇日", sub: "挑好日子" },
  { id: "synastry", title: "合盤", sub: "兩人配對" },
  ...(AI_ENABLED ? [{ id: "ai" as const, title: "問AI", sub: "命理師解盤" }] : []),
];

type Props = {
  chart: Chart;
  loading: boolean;
  /** 已存在「我的命盤」裡（分享連結開啟的命盤預設沒有） */
  isSaved: boolean;
  savedCharts: SavedChart[];
  onSwitchVariant: () => void;
  onEditBirth: () => void;
  onSave: () => void;
  /** 從流年頁（?liunian=2027）進來時，排盤後直接打開那一年的年運 */
  initialYear?: number;
  initialToday?: boolean;
};

/** 排盤結果（命盤、運勢、擇日、合盤四個分頁）。只在排盤後才載入 */
export default function ChartResult({ chart: initialChart, loading, isSaved, savedCharts, onSwitchVariant, onEditBirth, onSave, initialYear, initialToday }: Props) {
  const [chart, setChart] = useState(initialChart);
  const [view, setView] = useState<View>(initialYear || initialToday ? "fortune" : "chart");
  const [fortuneOpened, setFortuneOpened] = useState(!!(initialYear || initialToday));
  const [todayRequest, setTodayRequest] = useState(initialToday ? 1 : 0);
  const [chartFirst, setChartFirst] = useState(() => {
    try { return localStorage.getItem("ziwei:chart-first") === "1"; } catch { return false; }
  });
  const [selectedIndex, setSelectedIndex] = useState(() => chart.astrolabe.palaces.find((p) => p.name === "命宮")?.index ?? 0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const resultRef = useRef<HTMLElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const result = resultRef.current;
    result?.querySelector<HTMLElement>(".chart-result-heading")?.focus({ preventScroll: true });
    result?.scrollIntoView({ block: "start" });
  }, []);

  /** 點宮位：桌機在右側面板顯示，手機改從底部滑出 */
  const selectPalace = useCallback((index: number) => {
    setSelectedIndex(index);
    if (isCompactViewport()) setSheetOpen(true);
  }, []);

  function showPalace(index: number) {
    setSelectedIndex(index);
    requestAnimationFrame(() => chartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function switchView(next: View) {
    setView(next);
    // 頁面開著跨過時辰或午夜時，「現在」要跟著更新
    if (next === "fortune") {
      setFortuneOpened(true);
      const now = nowSelection(chart.astrolabe);
      if (JSON.stringify(now) !== JSON.stringify(chart.now)) setChart({ ...chart, now });
    }
    // 問 AI 由聊天視窗自己捲到定位（剛好佔滿螢幕）
    if (next !== "ai") resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /** 分頁列的方向鍵切換（WAI-ARIA tabs）：左右鍵換頁、Home/End 到頭尾 */
  function onTabKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const i = VIEWS.findIndex((v) => v.id === view);
    const target =
      e.key === "ArrowRight" ? (i + 1) % VIEWS.length
      : e.key === "ArrowLeft" ? (i + VIEWS.length - 1) % VIEWS.length
      : e.key === "Home" ? 0
      : e.key === "End" ? VIEWS.length - 1
      : -1;
    if (target < 0) return;
    e.preventDefault();
    switchView(VIEWS[target].id);
    e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[target]?.focus();
  }

  function changeStartView(checked: boolean) {
    setChartFirst(checked);
    try { localStorage.setItem("ziwei:chart-first", checked ? "1" : "0"); } catch {}
  }

  function showToday() {
    setTodayRequest((request) => request + 1);
    switchView("fortune");
  }

  const board = (
    <div ref={chartRef} className="grid min-w-0 scroll-mt-24 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <ChartBoard
          astrolabe={chart.astrolabe}
          input={chart.input}
          rulesText={chart.rulesText}
          selectedIndex={selectedIndex}
          horoscope={null}
          lens="natal"
          onSelect={selectPalace}
        />
        <Legend />
      </div>
      <div className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
        <PalaceDetail astrolabe={chart.astrolabe} selectedIndex={selectedIndex} horoscope={null} lens="natal" onSelect={setSelectedIndex} />
      </div>
    </div>
  );

  return (
    <section ref={resultRef} aria-label="排盤結果" className="mx-auto w-full max-w-[60rem] scroll-mt-2 px-3 pt-3 pb-12 sm:px-6 md:pt-5 md:pb-16">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        {/* 排盤後首頁的 H1 會收起，結果標題就是這個畫面的 H1 */}
        <h1 tabIndex={-1} className="chart-result-heading min-w-0 break-words font-serif text-xl font-bold tracking-wide sm:text-2xl">
          {chart.source === "share" ? "分享的命盤" : chart.input.name ? `${chart.input.name}的命盤` : "你的命盤"}
        </h1>
        <div className="flex max-w-full flex-wrap items-center gap-x-1">
          <button type="button" className="action-text" onClick={onEditBirth}>修改生辰</button>
          {isSaved ? (
            <span role="status" className="px-2 text-xs font-medium text-ink-soft">{chart.variant === "alt" ? "已儲存原始生辰" : "已存到我的命盤"}</span>
          ) : (
            <button type="button" className="action-primary" onClick={onSave}>{chart.variant === "alt" ? "儲存原始生辰" : "存到我的命盤"}</button>
          )}
          <ChartShare chart={chart} />
        </div>
      </div>

      {/* 桌機：分頁列固定在上方 */}
      <div data-sticky-tabs className="sticky top-0 z-30 mt-5 hidden bg-[linear-gradient(var(--paper)_75%,transparent)] pt-2 pb-3 md:block">
        <div role="tablist" aria-label="結果分頁" onKeyDown={onTabKeyDown} className="grid gap-1 border-b border-line" style={{ gridTemplateColumns: `repeat(${VIEWS.length}, minmax(0, 1fr))` }}>
          {VIEWS.map((v) => (
            <ViewTab key={v.id} active={view === v.id} onClick={() => switchView(v.id)} title={v.title} sub={v.sub} />
          ))}
        </div>
      </div>

      <div hidden={view !== "chart"} className="mt-4 space-y-5 md:mt-1 sm:space-y-6">
        {chart.resolved.alt && <BoundaryComparison chart={chart} alt={chart.resolved.alt} loading={loading} onSwitch={onSwitchVariant} />}
        {chartFirst && board}
        <ChartHighlights chart={chart} onToday={showToday} />
        {!chartFirst && board}
        <details className="border-y border-line px-1 text-sm">
          <summary className="min-h-11 cursor-pointer py-3 font-medium text-ink-soft">生辰資料與顯示偏好</summary>
          <div className="pb-3">
            <p className="text-ink-soft">{birthLine(chart)}</p>
            {chart.variant === "main" && chart.resolved.notes.length > 0 && (
              <p className="mt-1 text-gold">已校正，採 {chart.resolved.usedClock ? `${chart.resolved.usedClock} ` : ""}{slotName(chart.resolved.timeIndex)} 排盤</p>
            )}
            <div className="flex flex-wrap items-center gap-x-3">
              <button type="button" onClick={onEditBirth} className="action-text -ml-3">修改生辰</button>
              <label className="flex min-h-11 items-center gap-2">
                <input type="checkbox" checked={chartFirst} onChange={(e) => changeStartView(e.target.checked)} className="size-4 accent-accent" />
                預設直接看命盤
              </label>
            </div>
          </div>
        </details>
        <div id="natal-report" className="scroll-mt-24 border-t border-line pt-8">
          <p className="mb-4 text-sm font-bold tracking-wide text-gold">完整命盤解讀・格局、五運與十二宮</p>
          <NatalReport astrolabe={chart.astrolabe} natal={chart.natal} onSelectPalace={showPalace} onOpenFortune={() => switchView("fortune")} />
        </div>
        <ChartReports chart={chart} />
      </div>

      {fortuneOpened && (
        <div hidden={view !== "fortune"} className="mt-5 md:mt-1">
          <FortuneExplorer
            key={todayRequest}
            astrolabe={chart.astrolabe}
            input={chart.input}
            rulesText={chart.rulesText}
            now={chart.now}
            initialYear={todayRequest ? undefined : initialYear}
            initialLevel={todayRequest ? "daily" : "yearly"}
          />
        </div>
      )}

      {view === "days" && (
        <div className="mt-5 md:mt-1">
          <DayPicker
            astrolabe={chart.astrolabe}
            savedCharts={savedCharts}
            selfId={chartId(chart.saved)}
            onSelectPalace={(i) => {
              switchView("chart");
              showPalace(i);
            }}
          />
        </div>
      )}

      <div hidden={view !== "synastry"} className="mt-5 md:mt-1">
        <Synastry astrolabe={chart.astrolabe} selfName={chart.input.name} savedCharts={savedCharts} />
      </div>

      {view === "ai" && (
        <div className="mt-5 md:mt-1">
          <AiChat chart={chart} />
        </div>
      )}

      <PalaceSheet
        open={sheetOpen && view === "chart"}
        onClose={() => setSheetOpen(false)}
        label={`${palaceTitle(chart.astrolabe.palaces[selectedIndex].name)}詳情`}
      >
        <PalaceDetail astrolabe={chart.astrolabe} selectedIndex={selectedIndex} horoscope={null} lens="natal" onSelect={setSelectedIndex} bare />
      </PalaceSheet>

      {/* 手機：分頁改放底部，拇指就按得到 */}
      <nav
        aria-label="結果分頁"
        data-bottom-tabs
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <div role="tablist" onKeyDown={onTabKeyDown} className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${VIEWS.length}, minmax(0, 1fr))` }}>
          {VIEWS.map((v) => (
            <BottomTab key={v.id} active={view === v.id} onClick={() => switchView(v.id)} label={v.title} icon={v.id} />
          ))}
        </div>
      </nav>
    </section>
  );
}

function birthLine(chart: Chart) {
  const { input, saved } = chart;
  const place = PLACES.find((p) => p.id === saved.place);
  const date = formatBirthSummary(input).replace(/ \S+時$/, "");
  const time = saved.timeMode === "clock" ? saved.clock : TIME_SLOTS[input.timeIndex].label;
  return [`${date}（${rocYear(input.year)}年）${time}`, place && place.id !== "other" ? place.name : null, input.gender].filter(Boolean).join("・");
}

function ViewTab({ active, onClick, title, sub }: { active: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={`min-h-11 rounded-t-lg border-b-2 px-3 py-2 text-center transition ${active ? "border-accent bg-accent-soft text-accent" : "border-transparent text-ink-soft hover:bg-surface-2"}`}
    >
      <span className="block font-serif text-lg font-bold">{title}</span>
      <span className="block text-xs text-muted">{sub}</span>
    </button>
  );
}

function BottomTab({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: View }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={`relative flex h-16 flex-col items-center justify-center gap-1 transition ${active ? "text-accent" : "text-muted"}`}
    >
      {active && <span aria-hidden className="absolute top-0 h-0.5 w-10 rounded-full bg-accent" />}
      <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6">
        {icon === "chart" && (
          <>
            <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
            <path d="M3.5 9.17h17M3.5 14.83h17M9.17 3.5v17M14.83 3.5v17" />
          </>
        )}
        {icon === "fortune" && <path d="M3 17l5-6 4 4 4-7 5 6" strokeLinecap="round" strokeLinejoin="round" />}
        {icon === "days" && (
          <>
            <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
            <path d="M3.5 9.5h17M8 3v4M16 3v4" strokeLinecap="round" />
            <path d="M9 14.5l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {icon === "synastry" && (
          <>
            <circle cx="9" cy="12" r="5.5" />
            <circle cx="15" cy="12" r="5.5" />
          </>
        )}
        {icon === "ai" && (
          <>
            <path d="M4.5 5.5h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-4.5 3.5V16.5h-1a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z" strokeLinejoin="round" />
            <path d="M12 8.5l.9 1.9 1.9.9-1.9.9-.9 1.9-.9-1.9-1.9-.9 1.9-.9z" strokeLinejoin="round" />
          </>
        )}
      </svg>
      <span className={`font-serif text-sm ${active ? "font-bold" : ""}`}>{label}</span>
    </button>
  );
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-xs text-muted">
      <span>點宮位看詳情與三方四正</span>
      <span className="flex items-center gap-1.5">
        {(["祿", "權", "科", "忌"] as const).map((m) => (
          <span key={m} className={`rounded-[3px] px-1 leading-4 font-bold ${MUTAGEN_STYLE[m]}`}>
            {m}
          </span>
        ))}
        生年四化
      </span>
      <span className="flex items-center gap-1">
        <span className="font-serif font-bold text-star-major">主星</span>
        <span className="font-serif text-star-soft">吉星</span>
        <span className="font-serif text-star-tough">煞星</span>
      </span>
    </div>
  );
}
