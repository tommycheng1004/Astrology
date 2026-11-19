"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import MemberCalendar, { updateCalendar } from "@/components/MemberCalendar";
import ReportLauncher from "@/components/ReportLauncher";
import { accountServerSnapshot, accountSnapshot, openAccountDialog, subscribeAccount } from "@/lib/account";
import { chartCaption, parseCharts, readChartsRaw, subscribeCharts } from "@/lib/savedCharts";
import { shareHash } from "@/lib/shareLink";
import { AI_ENABLED } from "@/lib/site";

const EventRectification = dynamic(() => import("@/components/EventRectification"));

export default function MemberHome() {
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot, accountServerSnapshot);
  return (
    <>
      <h1 className="font-serif text-3xl font-bold sm:text-4xl">會員中心</h1>
      {!account.enabled ? <p className="mt-3 text-ink-soft">會員功能目前尚未開放。</p> : account.user
        ? <MemberTools key={account.user.uid} />
        : !account.ready
          ? <p role="status" className="mt-3 text-ink-soft">正在確認登入狀態…</p>
          : <button type="button" className="action-primary mt-4" onClick={openAccountDialog}>登入會員</button>}
    </>
  );
}

function MemberTools() {
  const raw = useSyncExternalStore(subscribeCharts, readChartsRaw, () => null);
  const charts = useMemo(() => parseCharts(raw), [raw]);
  const [selected, setSelected] = useState("");
  const chart = charts.find((item) => item.id === selected) ?? charts[0];
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [calendarRevision, setCalendarRevision] = useState(0);

  async function enableReminders() {
    if (!chart) return;
    setSaving(true);
    setStatus("");
    try {
      await updateCalendar("chart", { birth: shareHash(chart.saved).slice(3) });
      setCalendarRevision((revision) => revision + 1);
      setStatus("已設定流月提醒。展開下方的行事曆取得訂閱連結。");
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)]">
      <div className="space-y-3">
        <h2 className="font-serif text-xl font-bold">我的命盤</h2>
        {charts.length ? (
          <label className="block text-sm text-ink-soft">選擇要使用的命盤
            <select value={chart.id} disabled={saving} onChange={(e) => { setSelected(e.target.value); setStatus(""); }} className="mt-1 block h-11 w-full rounded-lg border border-line-strong bg-surface px-2 text-base text-ink">
              {charts.map((item) => <option value={item.id} key={item.id}>{item.saved.input.name || "未命名"} · {chartCaption(item.saved)}</option>)}
            </select>
          </label>
        ) : <p className="text-sm text-ink-soft">先在首頁排盤並存到「我的命盤」，即可在這裡使用進階功能。</p>}
        <Link className="action-text -ml-3" href="/">{charts.length ? "回首頁查看命盤" : "前往排盤"} <span aria-hidden>↗</span></Link>
      </div>
      <div className="min-w-0 space-y-5">
        {chart && (
          <section className="divide-y divide-line border-y border-line" aria-label="會員進階功能">
            <div className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div><h2 className="font-serif text-lg font-bold">本月流月報告</h2><p className="text-sm text-ink-soft">查看這個月的重點與提醒。</p></div>
              <ReportLauncher key={`month-${chart.id}`} kind="monthly" saved={chart.saved} className="action-secondary" disabled={saving}>查看報告</ReportLauncher>
            </div>
            {AI_ENABLED && <div className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div><h2 className="font-serif text-lg font-bold">深度解盤</h2><p className="text-sm text-ink-soft">由 AI 整理命盤，完成後站內通知。</p></div>
              <ReportLauncher key={`deep-${chart.id}`} kind="deep" saved={chart.saved} className="action-secondary" disabled={saving}>開始解盤</ReportLauncher>
            </div>}
            <div className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><h2 className="font-serif text-lg font-bold">流月提醒</h2><p className="text-sm text-ink-soft">把這張命盤的流月提醒加入訂閱行事曆。</p></div>
                <button type="button" disabled={saving} onClick={enableReminders} className="action-secondary">{saving ? "設定中…" : "啟用流月提醒"}</button>
              </div>
              <p role="status" className="mt-2 text-sm text-ink-soft empty:hidden">{status}</p>
            </div>
          </section>
        )}
        <MemberCalendar revision={calendarRevision} />
        {chart && <EventRectification key={chart.id} saved={chart.saved} />}
      </div>
    </div>
  );
}
