"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
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
import { lineShareHref, shareUrl } from "@/lib/shareLink";
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
};

/** 排盤結果（命盤、運勢、擇日、合盤四個分頁）。只在排盤後才載入 */
export default function ChartResult({ chart: initialChart, loading, isSaved, savedCharts, onSwitchVariant, onEditBirth, onSave, initialYear }: Props) {
  const [chart, setChart] = useState(initialChart);
  const [view, setView] = useState<View>(initialYear ? "fortune" : "chart");
  const [selectedIndex, setSelectedIndex] = useState(() => chart.astrolabe.palaces.find((p) => p.name === "命宮")?.index ?? 0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState<"share" | "image" | null>(null);
  /** 產生好的命盤圖片。分享要在使用者再按一次時才呼叫：產圖要時間，Safari 會判定已不是使用者操作而拒絕分享 */
  const [image, setImage] = useState<{ file: File; url: string } | null>(null);
  useEffect(() => () => {
    if (image) URL.revokeObjectURL(image.url);
  }, [image]);
  const resultRef = useRef<HTMLElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  /** 點宮位：桌機在右側面板顯示，手機改從底部滑出 */
  const selectPalace = useCallback((index: number) => {
    setSelectedIndex(index);
    if (isCompactViewport()) setSheetOpen(true);
  }, []);

  function showPalace(index: number) {
    setSelectedIndex(index);
    chartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function switchView(next: View) {
    setView(next);
    // 頁面開著跨過時辰或午夜時，「現在」要跟著更新
    if (next === "fortune") {
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

  async function share() {
    const url = shareUrl(chart.saved);
    setBusy("share");
    try {
      if (navigator.share) {
        await navigator.share({ title: "我的紫微命盤", url });
        setStatus("");
      } else {
        await navigator.clipboard.writeText(url);
        setStatus("已複製分享連結。連結裡有出生日期與時間（不含姓名），只傳給信任的人。");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setStatus("無法分享，請直接複製網址列的連結。");
    } finally {
      setBusy(null);
    }
  }

  async function saveImage() {
    setBusy("image");
    setStatus("");
    try {
      const { renderChartImage } = await import("@/lib/chartImage");
      const blob = await renderChartImage(chart.astrolabe, chart.input.name);
      const file = new File([blob], `紫微命盤-${chart.input.name || chart.astrolabe.solarDate}.png`, { type: "image/png" });
      setImage({ file, url: URL.createObjectURL(file) });
    } catch {
      setStatus("圖片產生失敗，請再試一次。");
    } finally {
      setBusy(null);
    }
  }

  async function shareImage() {
    if (!image) return;
    try {
      await navigator.share({ files: [image.file] });
    } catch (e) {
      if ((e as Error).name !== "AbortError") setStatus("無法分享，請改用「下載圖片」，或長按圖片儲存。");
    }
  }

  return (
    <section ref={resultRef} aria-label="排盤結果" className="mx-auto w-full max-w-6xl scroll-mt-2 px-3 pb-12 sm:px-6 md:pb-16">
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-wide sm:text-3xl">
            {chart.source === "share" ? "分享的命盤" : chart.input.name ? `${chart.input.name}的命盤` : "你的命盤"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {birthLine(chart)}
            <button type="button" onClick={onEditBirth} className="ml-2 inline-flex min-h-11 items-center text-accent underline underline-offset-4">
              修改生辰
            </button>
          </p>
          {chart.variant === "main" && chart.resolved.notes.length > 0 && (
            <p className="mt-1 text-sm text-gold">
              已校正：以 {chart.resolved.usedClock ? `${chart.resolved.usedClock} ` : ""}
              {slotName(chart.resolved.timeIndex)}排盤
            </p>
          )}
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          {!isSaved && (
            <button type="button" onClick={onSave} className={`${actionClass} border-accent text-accent`}>
              存到我的命盤
            </button>
          )}
          <button type="button" onClick={share} disabled={busy !== null} className={actionClass}>
            分享連結
          </button>
          {/* LINE 是台灣最常用的通訊軟體：手機開 LINE 的分享畫面，電腦開 LINE 的網頁分享 */}
          <a href={lineShareHref(chart.saved)} target="_blank" rel="noopener noreferrer" className={`${actionClass} inline-flex items-center justify-center`}>
            傳到 LINE
          </a>
          <button type="button" onClick={saveImage} disabled={busy !== null} className={actionClass}>
            {busy === "image" ? "產生中…" : "存成圖片"}
          </button>
        </div>
      </div>
      <p role="status" className="mt-2 px-1 text-sm text-ink-soft empty:hidden">
        {status}
      </p>

      {image && (
        <figure className="mt-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
          {/* eslint-disable-next-line @next/next/no-img-element -- 瀏覽器端產生的 blob 圖片，不經 Next 圖片最佳化 */}
          <img src={image.url} alt="命盤圖片預覽" className="mx-auto max-h-[60vh] w-auto rounded-lg border border-line" />
          <figcaption className="mt-3 flex flex-wrap items-center gap-2">
            <span className="mr-auto text-sm text-muted">手機可長按圖片存到相簿</span>
            {typeof navigator !== "undefined" && navigator.canShare?.({ files: [image.file] }) && (
              <button type="button" onClick={shareImage} className={`${actionClass} border-accent text-accent`}>
                分享圖片
              </button>
            )}
            <a href={image.url} download={image.file.name} className={`${actionClass} inline-flex items-center`}>
              下載圖片
            </a>
            <button type="button" onClick={() => setImage(null)} className={actionClass}>
              關閉
            </button>
          </figcaption>
        </figure>
      )}

      {chart.resolved.alt && <BoundaryNotice chart={chart} loading={loading} onSwitch={onSwitchVariant} />}

      {/* 桌機：分頁列固定在上方 */}
      <div data-sticky-tabs className="sticky top-0 z-30 mt-5 hidden bg-[linear-gradient(var(--paper)_75%,transparent)] pt-2 pb-3 md:block">
        <div role="tablist" aria-label="結果分頁" onKeyDown={onTabKeyDown} className="grid gap-1 rounded-2xl border border-line bg-surface p-1.5 shadow-sm" style={{ gridTemplateColumns: `repeat(${VIEWS.length}, minmax(0, 1fr))` }}>
          {VIEWS.map((v) => (
            <ViewTab key={v.id} active={view === v.id} onClick={() => switchView(v.id)} title={v.title} sub={v.sub} />
          ))}
        </div>
      </div>

      <div hidden={view !== "chart"} className="mt-5 space-y-10 md:mt-1">
        <div ref={chartRef} className="grid scroll-mt-24 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <ChartBoard
              astrolabe={chart.astrolabe}
              input={chart.input}
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

        <NatalReport astrolabe={chart.astrolabe} natal={chart.natal} onSelectPalace={showPalace} onOpenFortune={() => switchView("fortune")} />
      </div>

      <div hidden={view !== "fortune"} className="mt-5 md:mt-1">
        <FortuneExplorer astrolabe={chart.astrolabe} input={chart.input} now={chart.now} initialYear={initialYear} />
      </div>

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

const actionClass =
  "h-11 rounded-lg border border-line bg-surface px-4 text-sm text-ink-soft transition hover:border-accent hover:text-accent disabled:opacity-60";

function birthLine(chart: Chart) {
  const { input, saved } = chart;
  const place = PLACES.find((p) => p.id === saved.place);
  const date = formatBirthSummary(input).replace(/ \S+時$/, "");
  const time = saved.timeMode === "clock" ? saved.clock : TIME_SLOTS[input.timeIndex].label;
  return [`${date}（${rocYear(input.year)}年）${time}`, place && place.id !== "other" ? place.name : null, input.gender].filter(Boolean).join("・");
}

/** 出生時間離時辰交界很近：提醒並可切換到相鄰時辰的命盤比對 */
function BoundaryNotice({ chart, loading, onSwitch }: { chart: Chart; loading: boolean; onSwitch: () => void }) {
  const alt = chart.resolved.alt!;
  const mainSlot = slotName(chart.resolved.timeIndex);
  const altSlot = slotName(alt.timeIndex);
  const isAlt = chart.variant === "alt";
  return (
    <div
      role="note"
      className={`mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border px-4 py-3 text-sm leading-relaxed ${
        isAlt ? "border-accent/50 bg-accent-soft text-ink" : "border-gold/40 bg-gold/10 text-ink-soft"
      }`}
    >
      <p className="max-w-[42em]">
        {isAlt ? (
          <>
            目前顯示的是<strong className="font-bold text-accent">{alt.reason === "dst" ? "另一種解釋" : "相鄰"}的{altSlot}</strong>
            命盤，供比對用；原本的解釋屬{mainSlot}。
          </>
        ) : (
          <>
            {alt.reason === "dst"
              ? `出生當天剛好切換夏令時間，這個鐘點有兩種解釋，分屬${mainSlot}與${altSlot}。`
              : `出生時間離${altSlot}只差 ${Math.max(1, alt.minutes)} 分鐘。若時間是估的，`}
            可以兩個時辰都看看，哪一張的個性與經歷更像你，通常就是正確的時辰。
          </>
        )}
      </p>
      <button
        type="button"
        disabled={loading}
        onClick={onSwitch}
        className="h-11 shrink-0 rounded-lg border border-accent bg-surface px-4 font-medium text-accent transition hover:bg-accent hover:text-surface disabled:opacity-60"
      >
        {isAlt ? `回到${mainSlot}命盤` : `改看${altSlot}命盤`}
      </button>
    </div>
  );
}

function ViewTab({ active, onClick, title, sub }: { active: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-center transition ${active ? "bg-accent text-surface shadow-sm" : "text-ink-soft hover:bg-surface-2"}`}
    >
      <span className="block font-serif text-lg font-bold">{title}</span>
      <span className={`block text-xs ${active ? "text-surface/80" : "text-muted"}`}>{sub}</span>
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
      <span>採通行版排法</span>
    </div>
  );
}
