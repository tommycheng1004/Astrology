"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { memberFetch } from "@/lib/memberFetch";

const noticeEvent = "ziwei:deep-report";
const key = (uid: string) => `ziwei:deep-report:${uid}`;

export function rememberDeepReport(uid: string, id: string, ready: boolean) {
  try {
    localStorage.setItem(key(uid), JSON.stringify({ id, status: ready ? "ready" : "pending" }));
    window.dispatchEvent(new Event(noticeEvent));
  } catch {}
}

type Notice = { id: string; status: "pending" | "ready" | "failed"; read?: boolean };

export default function DeepReportNotice({ uid }: { uid: string }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      clearTimeout(timer);
      try {
        const stored = localStorage.getItem(key(uid));
        const value = stored ? JSON.parse(stored) as Notice : null;
        if (!value || !/^[0-9a-f]{64}$/.test(value.id)) return setNotice(null);
        if (value.status !== "pending") return setNotice(value);
        const res = await memberFetch(`/api/reports/${value.id}`, { signal: controller.signal });
        if (controller.signal.aborted || localStorage.getItem(key(uid)) !== stored) return;
        if (res.ok) {
          const { status } = await res.json();
          if (controller.signal.aborted || localStorage.getItem(key(uid)) !== stored) return;
          if (status === "ready" || status === "failed") {
            const updated = { id: value.id, status };
            localStorage.setItem(key(uid), JSON.stringify(updated));
            setNotice(updated);
            return;
          }
        }
        timer = setTimeout(refresh, 7000);
      } catch {
        if (!controller.signal.aborted) timer = setTimeout(refresh, 7000);
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === key(uid)) void refresh();
    };
    window.addEventListener(noticeEvent, refresh);
    window.addEventListener("storage", onStorage);
    void refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
      window.removeEventListener(noticeEvent, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [uid]);

  if (!notice || notice.status === "pending" || notice.read) return null;
  function dismiss() {
    if (!notice) return;
    const updated = { ...notice, read: true };
    try { localStorage.setItem(key(uid), JSON.stringify(updated)); } catch {}
    setNotice(updated);
  }
  return (
    <div role="status" className="fixed inset-x-3 bottom-20 z-50 mx-auto flex max-w-sm flex-wrap items-center justify-between gap-x-2 rounded-lg border border-line bg-surface px-3 py-1 text-sm text-ink shadow-lg sm:bottom-5">
      <p>{notice.status === "ready" ? "深度解盤已完成" : "深度解盤整理失敗，可回原命盤重試。"}</p>
      <div className="flex gap-3">
        {notice.status === "ready" && <Link className="inline-flex min-h-11 items-center font-bold text-accent underline" href={`/report/deep?record=${notice.id}`} onClick={dismiss}>查看報告</Link>}
        <button type="button" className="min-h-11 min-w-11 text-accent" onClick={dismiss}>關閉</button>
      </div>
    </div>
  );
}
