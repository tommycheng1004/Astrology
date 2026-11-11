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
import { parseShareHash } from "@/lib/shareLink";
import { AI_ENABLED } from "@/lib/site";
import { EngineLoadError, MAX_YEAR, MIN_YEAR } from "@/lib/ziwei";

/*
 * 首頁只先載入表單。排盤結果、解讀資料與 iztro 都在按下排盤時才下載，
 * 讓第一次開啟網頁的速度不受這些大型模組拖累。
 */
const loadEngine = () => import("@/lib/buildChart");
const loadResult = () => import("@/components/ChartResult");
const ChartResult = dynamic(loadResult);
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

export default function ZiweiApp({ intro, outro }: { intro: ReactNode; outro?: ReactNode }) {
  const [chart, setChart] = useState<Chart | null>(null);
  const [choices, setChoices] = useState<{ saved: SavedBirth; list: TimeChoice[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 排盤後把表單收起來，結果頁直接從命盤開始；按「修改生辰」再打開 */
  const [formOpen, setFormOpen] = useState(true);
  const formRef = useRef<HTMLDivElement>(null);
  const inLine = useSyncExternalStore(noSubscribe, isLineBrowser, () => false);
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot, accountServerSnapshot);
  const liunian = useSyncExternalStore(noSubscribe, liunianParam, () => null);

  const chartsRaw = useSyncExternalStore(subscribeCharts, readChartsRaw, () => null);
  const charts = useMemo(() => parseCharts(chartsRaw), [chartsRaw]);
  // 表單預設帶入最近一張命盤；按「清空」或點清單時換一份初始值（以 key 重設表單）
  const [seedOverride, setSeedOverride] = useState<FormSeed | null>(null);
  const seed: FormSeed = seedOverride ?? (charts[0] ? { key: `last-${charts[0].id}`, initial: charts[0].saved, remembered: true } : { key: "empty", initial: EMPTY_BIRTH, remembered: false });

  async function run(saved: SavedBirth, variant: Chart["variant"] = "main", source: Chart["source"] = "form") {
    setLoading(true);
    setError(null);
    try {
      const [engine] = await Promise.all([loadEngine(), loadResult()]).catch(() => {
        throw new EngineLoadError();
      });
      if (saved.timeMode === "unknown") {
        setChoices({ saved, list: await engine.buildTimeChoices(saved) });
        setChart(null);
        return;
      }
      const next = await engine.buildChart(saved, variant, source);
      if (source === "form") {
        upsertChart(saved);
        // 自己排的盤不沿用分享連結的網址
        if (location.hash) history.replaceState(null, "", location.pathname + location.search);
      }
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
      const shared = parseShareHash(location.hash);
      if (shared) run(shared, "main", "share");
    }
    openShared();
    window.addEventListener("hashchange", openShared);
    return () => window.removeEventListener("hashchange", openShared);
  }, []);

  function openSaved(item: SavedChart) {
    setSeedOverride({ key: `pick-${item.id}-${Date.now()}`, initial: item.saved, remembered: true });
    run(item.saved);
  }

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function editBirth() {
    // 先讓表單出現在畫面上，才捲得過去
    flushSync(() => setFormOpen(true));
    scrollToForm();
  }

  const isSaved = !!chart && charts.some((c) => c.id === chartId(chart.saved));

  return (
    <>
      <section
        className={`${chart && !formOpen ? "hidden" : "grid"} mx-auto w-full max-w-6xl items-center gap-7 px-4 pt-6 pb-12 sm:gap-10 sm:px-6 lg:grid-cols-[1fr_440px] lg:gap-16 lg:pt-16 lg:pb-20`}
      >
        <div>{intro}</div>
        <div ref={formRef} className="scroll-mt-6 space-y-4">
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
          {charts.length > 0 && <MyCharts charts={charts} loading={loading} onOpen={openSaved} />}
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
                  ? "排盤在你的瀏覽器中計算；你已登入，排過的命盤會同步到你的帳號。"
                  : AI_ENABLED
                    ? "排盤在你的瀏覽器中計算，不會上傳；只有使用「問 AI」時，才會送出生辰（不含姓名）。"
                    : "資料只在你的瀏覽器中計算與保存，不會上傳。"
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

      {choices && !chart && (
        <TimeChooser
          choices={choices.list}
          loading={loading}
          onPick={(timeIndex) => run({ ...choices.saved, timeMode: "slot", input: { ...choices.saved.input, timeIndex } })}
          onCancel={() => {
            setChoices(null);
            scrollToForm();
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
          initialYear={liunian ?? undefined}
        />
      )}

      {/* 排盤後頁面只留結果，首頁的入門說明與常見問題收起來，避免結果頁拉得太長 */}
      {!chart && !choices && outro}
    </>
  );
}

/** 「我的命盤」：排過的命盤只存在這個瀏覽器，點一下就重新排出來 */
function MyCharts({ charts, loading, onOpen }: { charts: SavedChart[]; loading: boolean; onOpen: (c: SavedChart) => void }) {
  const [editing, setEditing] = useState(false);
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot, accountServerSnapshot);
  return (
    <section aria-labelledby="my-charts-title" className="rounded-2xl border border-line bg-surface/90 p-4 sm:px-5">
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
              className="flex min-h-11 flex-1 items-baseline gap-2 rounded-lg px-2 text-left transition hover:bg-surface-2 disabled:hover:bg-transparent"
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
