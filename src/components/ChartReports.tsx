"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { accountServerSnapshot, accountSnapshot, subscribeAccount } from "@/lib/account";
import { annualPreview, REPORT_YEAR } from "@/lib/annualReport";
import type { Chart } from "@/lib/buildChart";
import ReportLauncher from "@/components/ReportLauncher";
import { MonthFocus } from "@/components/ReportReader";
import { AI_ENABLED } from "@/lib/site";

/**
 * 命盤頁最下方的「會員功能」：流年報告預覽，以及流月報告、深度解盤可直接用這張命盤開啟；
 * 流月提醒與事件定盤要選定已儲存的命盤，所以連到會員中心。沒開會員功能時只顯示流年預覽。
 */
export default function ChartReports({ chart }: { chart: Chart }) {
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot, accountServerSnapshot);
  const preview = useMemo(() => annualPreview(chart.astrolabe), [chart.astrolabe]);
  const signedIn = !!account.user;
  if (!preview && !account.enabled) return null;
  return (
    <section aria-labelledby="member-tools-heading" className="rounded-2xl bg-accent-soft px-4 py-5 text-ink sm:px-6 sm:py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="member-tools-heading" className="font-serif text-2xl font-bold">會員功能</h2>
        {account.enabled && <p className="text-sm text-ink-soft">{signedIn ? "用這張命盤直接開啟" : "免費註冊即可使用"}</p>}
      </div>

      {preview && (
        <div className="mt-4 rounded-xl bg-surface/70 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div className="min-w-0 flex-1 basis-56">
              <h3 className="font-serif text-lg font-bold">{REPORT_YEAR} 流年報告</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{preview.summary}</p>
            </div>
            {account.enabled && (
              <ReportLauncher kind="annual" saved={chart.saved} variant={chart.variant}>
                {signedIn ? `看完整 ${REPORT_YEAR} 報告` : "登入看完整報告"}
              </ReportLauncher>
            )}
          </div>
          <details className="mt-1 text-sm text-ink-soft">
            <summary className="min-h-11 cursor-pointer py-3 font-medium text-accent">預覽農曆正月</summary>
            <p className="mb-2 text-xs">{preview.januaryRange}</p>
            <MonthFocus focus={preview.january} />
          </details>
        </div>
      )}

      {account.enabled && (
        <>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            <Tool title="本月流月報告" body="這個月的重點與提醒。">
              <ReportLauncher kind="monthly" saved={chart.saved} variant={chart.variant} className="action-secondary">
                {signedIn ? "查看報告" : "登入查看"}
              </ReportLauncher>
            </Tool>
            {AI_ENABLED && (
              <Tool title="深度解盤" body="AI 整理整張命盤，完成後站內通知。">
                <ReportLauncher kind="deep" saved={chart.saved} variant={chart.variant} className="action-secondary">
                  {signedIn ? "開始解盤" : "登入使用"}
                </ReportLauncher>
              </Tool>
            )}
          </ul>
          <p className="mt-4 text-sm text-ink-soft">
            流月提醒（加入手機行事曆）、事件定盤（用人生大事推算出生時辰）在
            <Link href="/account" className="mx-1 font-medium text-accent underline underline-offset-4">會員中心</Link>
            ，要先把這張命盤存到「我的命盤」。
          </p>
        </>
      )}
    </section>
  );
}

function Tool({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface/70 p-4">
      <div className="min-w-0 flex-1 basis-40">
        <h3 className="font-serif text-lg font-bold">{title}</h3>
        <p className="text-sm text-ink-soft">{body}</p>
      </div>
      {children}
    </li>
  );
}
