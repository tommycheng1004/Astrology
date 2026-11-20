"use client";

import { useMemo, useSyncExternalStore } from "react";
import { accountServerSnapshot, accountSnapshot, subscribeAccount } from "@/lib/account";
import { annualPreview } from "@/lib/annualReport";
import type { Chart } from "@/lib/buildChart";
import ReportLauncher from "@/components/ReportLauncher";
import { MonthFocus } from "@/components/ReportReader";

export default function ChartReports({ chart }: { chart: Chart }) {
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot, accountServerSnapshot);
  const preview = useMemo(() => annualPreview(chart.astrolabe), [chart.astrolabe]);
  if (!preview) return null;
  return (
    <section aria-labelledby="annual-preview-heading" className="rounded-2xl bg-accent-soft px-4 py-4 text-ink sm:px-6 sm:py-5">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 basis-56">
          <h2 id="annual-preview-heading" className="font-serif text-xl font-bold">2027 流年報告</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{preview.summary}</p>
        </div>
        {account.enabled && (
          <ReportLauncher kind="annual" saved={chart.saved} variant={chart.variant}>
            {account.user ? "看完整 2027 報告" : "登入看完整報告"}
          </ReportLauncher>
        )}
      </div>
      <details className="mt-1 text-sm text-ink-soft">
        <summary className="min-h-11 cursor-pointer py-3 font-medium text-accent">預覽農曆正月</summary>
        <p className="mb-2 text-xs">{preview.januaryRange}</p>
        <MonthFocus focus={preview.january} />
      </details>
    </section>
  );
}
