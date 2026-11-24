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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-3xl font-bold sm:text-4xl">會員中心</h1>
        {account.admin && (
          <Link href="/admin" className="inline-flex min-h-11 items-center text-sm font-medium text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent">
            管理後台 →
          </Link>
        )}
      </div>
      {!account.enabled ? <p className="mt-3 text-ink-soft">會員功能目前尚未開放。</p> : account.user
        ? <MemberTools key={account.user.uid} />
        : !account.ready
          ? <p role="status" className="mt-3 text-ink-soft">正在確認登入狀態…</p>
          : <SignedOut />}
    </>
  );
}

const MEMBER_FEATURES = [
  { title: "我的命盤雲端同步", body: "換手機、換電腦登入，存過的命盤都在。" },
  { title: "流年、流月報告", body: "整理一整年與每個月的重點和提醒。" },
  ...(AI_ENABLED ? [{ title: "深度解盤與問 AI", body: "AI 整理整張命盤；會員每天可問的題數比訪客多。" }] : []),
  { title: "流月提醒", body: "訂閱到手機行事曆，每個月自動提醒。" },
  { title: "事件定盤", body: "不確定出生時辰？用結婚、換工作等人生大事推算。" },
];

function SignedOut() {
  return (
    <div className="mt-5 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <p className="text-ink-soft">登入後可以使用：</p>
      <ul className="mt-3 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {MEMBER_FEATURES.map((f) => (
          <li key={f.title} className="flex gap-3">
            <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-gold" />
            <div>
              <h2 className="font-serif text-lg font-bold">{f.title}</h2>
              <p className="mt-0.5 text-sm text-ink-soft">{f.body}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" className="action-primary px-6" onClick={openAccountDialog}>登入或免費註冊</button>
        <span className="text-sm text-muted">可用 Google 帳號或 Email</span>
      </div>
    </div>
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
