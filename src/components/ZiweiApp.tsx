"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { flushSync } from "react-dom";
import BirthForm, { EMPTY_BIRTH, type BirthDraft, type SavedBirth } from "@/components/BirthForm";
import type { Chart, TimeChoice } from "@/lib/buildChart";
import {
  chartCaption,
  chartId,
  clearCharts,
  parseCharts,
  readChartsRaw,
  removeChart,
  subscribeCharts,
  upsertChart,
  type SavedChart,
} from "@/lib/savedCharts";
import { accountServerSnapshot, accountSnapshot, openAccountDialog, subscribeAccount } from "@/lib/account";
import { track } from "@/lib/analytics";
import { parseSharedChart } from "@/lib/shareLink";
import { EngineLoadError, MAX_YEAR, MIN_YEAR } from "@/lib/ziwei";

/*
 * 首頁只先載入表單。排盤結果、解讀資料與 iztro 都在按下排盤時才下載，
 * 讓第一次開啟網頁的速度不受這些大型模組拖累。
 */
const loadEngine = () => import("@/lib/buildChart");
const loadResult = () => import("@/components/ChartResult");
const ChartResult = dynamic(loadResult);
const TodayOverview = dynamic(() => import("@/components/TodayOverview"), { loading: () => <p role="status" className="py-4 text-sm text-ink-soft">正在載入今日運勢…</p> });
const TimeChooser = dynamic(() => import("@/components/TimeChooser"));

/** LINE 內建瀏覽器的 User-Agent 含「Line/版本」 */
const noSubscribe = () => () => {};
const isLineBrowser = () => /\bLine\/\d/.test(navigator.userAgent);

/** 網址的 ?liunian=2027：從流年頁進來，排盤後直接看那一年的運勢 */
function liunianParam() {
  const year = Number(new URLSearchParams(location.search).get("liunian"));
  return Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR ? year : null;
}

type FormSeed = { key: string; initial: SavedBirth | BirthDraft; remembered: boolean };

export default function ZiweiApp({ intro, yearBanner, outro }: { intro: ReactNode; yearBanner?: ReactNode; outro?: ReactNode }) {
  const [chart, setChart] = useState<Chart | null>(null);
  const [choices, setChoices] = useState<{ saved: SavedBirth; list: TimeChoice[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState<boolean | null>(null);
  const [initialToday, setInitialToday] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const inLine = useSyncExternalStore(noSubscribe, isLineBrowser, () => false);
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot, accountServerSnapshot);
  const liunian = useSyncExternalStore(noSubscribe, liunianParam, () => null);

  const chartsRaw = useSyncExternalStore(subscribeCharts, readChartsRaw, () => null);
  const charts = useMemo(() => parseCharts(chartsRaw), [chartsRaw]);
  // 表單預設帶入最近一張命盤；按「清空」或點清單時換一份初始值（以 key 重設表單）
  const [seedOverride, setSeedOverride] = useState<FormSeed | null>(null);
  const seed: FormSeed = seedOverride ?? (charts[0] ? { key: `last-${charts[0].id}`, initial: charts[0].saved, remembered: true } : { key: "empty", initial: EMPTY_BIRTH, remembered: false });

  const returning = charts.length > 0 && !liunian;
  const showForm = formOpen ?? !returning;
  const showHome = !chart && !choices;

  async function run(saved: SavedBirth, variant: Chart["variant"] = "main", source: Chart["source"] = "form", today = false) {
    setLoading(true);
    setError(null);
    try {
      const [engine] = await Promise.all([loadEngine(), loadResult()]).catch(() => {
        throw new EngineLoadError();
      });
      if (saved.timeMode === "unknown") {
        setChoices({ saved, list: await engine.buildTimeChoices(saved) });
        track("chart_create", { source, time_known: false });
        setChart(null);
        setFormOpen(false);
        return;
      }
      const next = await engine.buildChart(saved, variant, source);
      track("chart_create", { source, time_known: true });
      if (source === "form" && location.hash) history.replaceState(null, "", location.pathname + location.search);
      setInitialToday(today);
      setChoices(null);
      setChart(next);
      setFormOpen(false);
    } catch (e) {
      setError(
        e instanceof EngineLoadError
          ? "排盤程式載入失敗，請確認網路連線後再按一次。"
          : saved.input.calendar === "lunar"
            ? "查無此農曆日期，請確認月份大小或閏月設定。"
            : "無法排出命盤，請確認出生日期是否正確。",
      );
    } finally {
      setLoading(false);
    }
  }

  // 從分享連結（#c=…）開啟時直接排出那張命盤，不存進「我的命盤」
  useEffect(() => {
    function openShared() {
      const shared = parseSharedChart(location.hash);
      if (shared) run(shared.saved, shared.variant, "share");
    }
    openShared();
    window.addEventListener("hashchange", openShared);
    return () => window.removeEventListener("hashchange", openShared);
  }, []);

  function openSaved(item: SavedChart, today = false) {
    void run(item.saved, "main", "form", today);
  }

  function newChart() {
    setSeedOverride({ key: `new-${Date.now()}`, initial: EMPTY_BIRTH, remembered: false });
    flushSync(() => setFormOpen(true));
    scrollToForm();
  }

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function editBirth() {
    const saved = chart?.saved ?? choices?.saved;
    if (saved) setSeedOverride({ key: `edit-${Date.now()}`, initial: saved, remembered: false });
    flushSync(() => setFormOpen(true));
    scrollToForm();
  }

  const savedVersion = chart && charts.find((item) => item.id === chartId(chart.saved));
  const isSaved = !!chart && savedVersion?.saved.input.name === chart.input.name;

  return (
    <>
      {showHome && returning && (
        <div className="mx-auto w-full max-w-[60rem] px-4 pt-5 sm:px-6 sm:pt-8">
          <h1 className="sr-only">紫微斗數免費排盤</h1>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <TodayOverview key={charts[0].id} item={charts[0]} loading={loading} onOpen={() => openSaved(charts[0], true)} />
            <MyCharts charts={charts} loading={loading} onOpen={openSaved} onNew={newChart} />
          </div>
          {!showForm && error && <p role="alert" className="mt-2 text-sm text-ji">{error}</p>}
        </div>
      )}
      <section
        className={`${showForm ? "grid" : "hidden"} mx-auto w-full max-w-[60rem] items-start gap-4 px-4 pt-5 pb-6 sm:gap-7 sm:px-6 sm:pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,29rem)] lg:gap-10`}
      >
        {showHome && !returning && <div className="lg:pt-6">{intro}</div>}
        <div ref={formRef} onFocusCapture={() => setFormOpen(true)} className="min-w-0 scroll-mt-6 space-y-3 lg:col-start-2">
          {inLine && (
            <p role="note" className="rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm leading-relaxed text-ink-soft">
              你正在 LINE 裡瀏覽。存下的命盤只會留在 LINE 的瀏覽器，換到 Safari 或 Chrome 就看不到；想長期保存，請點右上角的選單，選「用預設瀏覽器開啟」。
            </p>
          )}
          {liunian && (
            <p role="note" className="rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-[15px] leading-relaxed text-ink">
              排好命盤後，會直接帶你看 <strong>{liunian} 年</strong>的流年運勢。
            </p>
          )}
          <div>
            <BirthForm
              key={seed.key}
              loading={loading}
              initial={seed.initial}
              remembered={seed.remembered}
              onForget={() => setSeedOverride({ key: `empty-${Date.now()}`, initial: EMPTY_BIRTH, remembered: false })}
              onSubmit={(saved) => run(saved)}
              allowUnknownTime
              note={
                account.user
                  ? "生辰在瀏覽器中排盤。儲存後可在帳號的命盤清單查看。"
                  : "生辰在你的瀏覽器中排盤。"
              }
            />
            {error && (
              <p role="alert" className="mt-3 rounded-lg border border-ji/30 bg-ji/10 px-4 py-3 text-sm text-ji">
                {error}
              </p>
            )}
          </div>
        </div>
      </section>

      {showHome && !!liunian && charts.length > 0 && (
        <div className="mx-auto mb-4 w-full max-w-[60rem] px-4 sm:px-6">
          <MyCharts charts={charts} loading={loading} onOpen={openSaved} onNew={newChart} />
        </div>
      )}
      {showHome && yearBanner && <div className="mx-auto mb-8 w-full max-w-[60rem] px-4 sm:px-6">{yearBanner}</div>}

      {choices && !chart && (
        <TimeChooser
          choices={choices.list}
          saved={choices.saved}
          loading={loading}
          onPick={(timeIndex) => run({ ...choices.saved, timeMode: "slot", input: { ...choices.saved.input, timeIndex } })}
          onCancel={() => {
            editBirth();
            setChoices(null);
          }}
        />
      )}

      {chart && (
        <ChartResult
          key={chart.id}
          chart={chart}
          loading={loading}
          isSaved={isSaved}
          savedCharts={charts}
          onSwitchVariant={() => run(chart.saved, chart.variant === "main" ? "alt" : "main", chart.source)}
          onEditBirth={editBirth}
          onSave={() => upsertChart(chart.saved)}
          initialYear={initialToday ? undefined : liunian ?? undefined}
          initialToday={initialToday}
        />
      )}

      {/* 排盤後頁面只留結果，首頁的入門說明與常見問題收起來，避免結果頁拉得太長 */}
      {!chart && !choices && outro}
    </>
  );
}

/** 「我的命盤」：點已存的命盤即可重新排盤 */
function MyCharts({ charts, loading, onOpen, onNew }: { charts: SavedChart[]; loading: boolean; onOpen: (c: SavedChart) => void; onNew: () => void }) {
  const [editing, setEditing] = useState(false);
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot, accountServerSnapshot);
  return (
    <section aria-labelledby="my-charts-title" className="min-w-0 rounded-2xl border border-line bg-surface p-4 sm:px-5">
      <div className="flex items-center justify-between gap-2">
        <h2 id="my-charts-title" className="font-serif text-base font-bold">
          我的命盤 <span className="text-sm font-normal text-muted">{charts.length}</span>
        </h2>
        <button type="button" onClick={() => setEditing(!editing)} className="min-h-11 px-2 text-sm text-accent underline underline-offset-4">
          {editing ? "完成" : "管理"}
        </button>
      </div>
      <ul className="mt-1 flex max-h-56 flex-col gap-1 overflow-y-auto">
        {charts.map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading || editing}
              onClick={() => onOpen(c)}
              className="flex min-h-11 min-w-0 flex-1 flex-wrap items-center gap-x-2 rounded-lg px-2 text-left transition hover:bg-surface-2 disabled:hover:bg-transparent"
            >
              <span className="font-medium text-ink">{c.saved.input.name || "未命名"}</span>
              <span className="text-sm text-muted">{chartCaption(c.saved)}</span>
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => removeChart(c.id)}
                aria-label={`刪除 ${c.saved.input.name || "未命名"}（${chartCaption(c.saved)}）`}
                className="h-11 shrink-0 rounded-lg px-3 text-sm text-ji hover:bg-ji/10"
              >
                刪除
              </button>
            )}
          </li>
        ))}
      </ul>
      {!editing && <button type="button" onClick={onNew} disabled={loading} className="action-secondary mt-2">新增命盤</button>}
      {editing && (
        <button
          type="button"
          onClick={() => {
            if (confirm(account.user ? "確定要刪除所有命盤嗎？帳號裡同步的命盤也會一起刪除。" : "確定要刪除這個瀏覽器裡的所有命盤嗎？")) clearCharts();
            setEditing(false);
          }}
          className="mt-1 min-h-11 px-2 text-sm text-ji underline underline-offset-4"
        >
          全部刪除
        </button>
      )}
      {account.user ? (
        <p className="mt-1 text-xs text-muted">已同步到你的帳號，換裝置登入也看得到。</p>
      ) : (
        <p className="mt-1 text-xs text-muted">
          只存在這個瀏覽器，不會上傳。
          {account.enabled && (
            <button type="button" onClick={openAccountDialog} className="ml-1 inline-flex min-h-11 items-center text-accent underline underline-offset-4">
              登入後可跨裝置同步
            </button>
          )}
        </p>
      )}
    </section>
  );
}
