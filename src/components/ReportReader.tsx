"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ReportInfo } from "@/content/reports";
import { accountServerSnapshot, accountSnapshot, openAccountDialog, subscribeAccount } from "@/lib/account";
import { track } from "@/lib/analytics";
import { AI_ENABLED } from "@/lib/site";
import type { MonthReport, ReportKind, ReportRecord } from "@/lib/annualReport";
import { memberFetch, userMessage } from "@/lib/memberFetch";

// 帶有排盤設定，訪客用不到，登入後才載入
const ReportQuickOpen = dynamic(() => import("@/components/ReportQuickOpen"), {
  loading: () => <p role="status">正在讀取我的命盤…</p>,
});

export function MonthFocus({ focus }: { focus: MonthReport | null }) {
  if (!focus) return <p>這個月超出可推算的運限範圍。</p>;
  return (
    <dl className="space-y-2">
      {([["可以多花心力", focus.best], ["需要留意", focus.watch]] as const).map(([title, item]) => (
        <div key={title}>
          <dt className="font-bold">{title} · {item.label}</dt>
          <dd>
            {item.summary && <p>{item.summary}</p>}
            {item.insight && <p className={item.summary ? "mt-1 text-sm text-ink-soft" : undefined}>{item.summary && "盤面依據 · "}{item.insight}</p>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** 還沒登入、或登入了但還沒指定命盤時：先讓人知道這份報告有什麼，再請他登入或選命盤 */
function ReportIntro({ info, children }: { info: ReportInfo; children: React.ReactNode }) {
  return (
    <section aria-labelledby="report-intro-heading" className="space-y-4 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 id="report-intro-heading" className="font-serif text-lg font-bold">報告內容</h2>
      <ul className="space-y-3">
        {info.items.map((item) => (
          <li key={item.title} className="flex gap-3">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-gold" />
            <p><strong className="font-bold text-ink">{item.title}</strong><span className="block text-ink-soft">{item.body}</span></p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">{info.note}</p>
      <div className="border-t border-line pt-4">{children}</div>
    </section>
  );
}

export default function ReportReader({ info, kind }: { info: ReportInfo; kind: ReportKind }) {
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot, accountServerSnapshot);
  const id = useSearchParams().get("record");
  const [loaded, setLoaded] = useState<{ uid: string; id: string | null; value?: ReportRecord; error?: string } | null>(null);
  const uid = account.user?.uid;
  const current = uid === loaded?.uid && id === loaded?.id ? loaded : null;
  const record = current?.value;
  const error = current?.error;

  useEffect(() => {
    if (!uid || !id) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let delay = 1200;
    async function refresh() {
      try {
        const res = await memberFetch(`/api/reports/${encodeURIComponent(id ?? "")}`, { signal: controller.signal });
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "找不到報告。");
        const value = await res.json() as ReportRecord;
        if (controller.signal.aborted) return;
        setLoaded({ uid: uid!, id, value });
        if (value.status === "pending") {
          timer = setTimeout(refresh, delay);
          delay = Math.min(delay * 2, 6000);
        }
      } catch (reason) {
        if (!controller.signal.aborted) setLoaded({ uid: uid!, id, error: userMessage(reason) });
      }
    }
    void refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [uid, id]);

  const ready = record?.status === "ready" ? record : null;
  // 報告整理完成並顯示（漏斗最後一步），同一份報告只記一次
  const tracked = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || tracked.current === id) return;
    tracked.current = id;
    track("report_view", { report: kind });
  }, [ready, id, kind]);

  const report = ready?.report;
  const facts = report?.kind === "annual" ? report.facts : null;
  const title = report?.kind === "monthly" ? `${report.date} 流月報告` : info.title;
  return (
    <main className="report-print mx-auto w-full max-w-3xl space-y-6 px-4 py-8 text-sm leading-relaxed sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-2xl font-bold sm:text-3xl">{title}</h1>
        {ready && <button type="button" onClick={() => window.print()} className="report-actions min-h-11 rounded-lg border border-line px-4 text-accent">列印／存成 PDF</button>}
      </div>
      {!ready && (!uid || !id) && <p className="text-base text-ink-soft">{info.lead}</p>}
      {!uid && (!account.enabled ? <p>會員功能尚未設定。</p> : !account.ready ? <p role="status">正在確認登入狀態…</p> : (
        <ReportIntro info={info}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <button type="button" onClick={openAccountDialog} className="action-primary px-6">免費註冊／登入後閱讀</button>
            <Link href="/" className="action-text">還沒排盤？先免費排盤 <span aria-hidden>→</span></Link>
          </div>
          <p className="mt-2 text-xs text-muted">可用 Google 帳號或 Email 註冊，會員功能目前免費。</p>
        </ReportIntro>
      ))}
      {uid && !id && <ReportIntro info={info}><ReportQuickOpen kind={kind} /></ReportIntro>}
      {uid && id && !ready && <p role="status">{error ?? (record?.status === "failed" ? "報告整理失敗，可返回原命盤重新產生。" : "正在整理報告…完成後會在這裡顯示。")}</p>}
      {ready && <p role="status" className="sr-only">報告已完成</p>}
      {facts && (
        <>
          <p>{facts.summary}</p>
          <section className="space-y-2">
            <h2 className="font-serif text-xl font-bold">十項流年運勢</h2>
            <p>分數越高，代表依本站規則，這張命盤在該面向可借力的地方越多。</p>
            <dl className="grid gap-3 sm:grid-cols-2">
              {facts.aspects.map((item) => <div key={item.label}><dt className="font-bold">{item.label}</dt><dd>{item.summary && <p>{item.summary}</p>}{item.level} · {item.score} 分</dd></div>)}
            </dl>
          </section>
          <section className="space-y-2">
            <h2 className="font-serif text-xl font-bold">犯太歲與流年四化</h2>
            <p>{facts.taisui.length ? facts.taisui.map((item) => `${item}太歲`).join("、") : "依本站生肖規則，未遇到犯太歲的組合。"}</p>
            <p>四化是命盤上的四種標記。傳統上用「祿」看機會、「權」看主導權、「科」看名聲與助力、「忌」看容易卡住的地方。下面列的是今年這些標記落在哪裡。</p>
            <ul className="list-disc pl-5">{facts.mutagens.map((item) => <li key={item.change}>{item.star}化{item.change}入本命{item.palace}</li>)}</ul>
          </section>
          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold">十二流月重點</h2>
            {facts.months.map((item) => (
              <article key={item.label} className="report-keep space-y-2 rounded-lg border border-line p-3">
                <h3 className="font-bold">{item.label} · {item.range}</h3>
                <MonthFocus focus={item.focus} />
              </article>
            ))}
          </section>
          <section className="space-y-2">
            <h2 className="font-serif text-xl font-bold">全年擇日</h2>
            <dl className="space-y-2">
              {facts.days.map((item) => (
                <div key={item.purpose} className="report-keep">
                  <dt className="font-bold">{item.purpose}</dt><dd>{item.dates.join("、") || "沒有符合條件的日期"}</dd>
                </div>
              ))}
            </dl>
          </section>
        </>
      )}
      {report?.kind === "monthly" && <MonthFocus focus={report.facts} />}
      {ready && AI_ENABLED && !ready.narrative && <p>這份報告顯示本站規則計算結果。可從命盤結果同意 AI 整理後重新開啟。</p>}
      {ready?.narrative && <section className="space-y-2"><h2 className="font-serif text-xl font-bold">AI 解讀</h2><p className="whitespace-pre-wrap">{ready.narrative}</p></section>}
      {ready && <p>命理內容供個人參考。涉及健康、投資或法律，請諮詢專業人士。</p>}
      {uid && id && <Link href="/" className="report-actions inline-flex min-h-11 items-center text-accent underline">回首頁排盤</Link>}
    </main>
  );
}
