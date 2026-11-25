"use client";

import { useEffect, useState } from "react";
import { memberFetch, userMessage } from "@/lib/memberFetch";

type Settings = { token?: string; dates: string[]; hasChart: boolean };
const button = "inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-3 text-sm font-bold text-accent disabled:opacity-60";

export async function updateCalendar(action: "reset" | "chart" | "save" | "remove", values: { date?: string; birth?: string; variant?: string } = {}) {
  const res = await memberFetch("/api/calendar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...values }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "無法更新行事曆。");
  return data as Settings;
}

export default function MemberCalendar({ revision = 0 }: { revision?: number }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    memberFetch("/api/calendar", { signal: controller.signal }).then(async (res) => {
      if (!res.ok) throw new Error("無法讀取行事曆設定。");
      const data = await res.json() as Settings;
      if (!controller.signal.aborted) setSettings(data);
    }).catch((error: Error) => {
      if (!controller.signal.aborted) setStatus(error.message);
    });
    return () => controller.abort();
  }, [open, revision]);

  async function change(action: "reset" | "remove", date?: string) {
    setBusy(true);
    setStatus("");
    try {
      setSettings(await updateCalendar(action, { date }));
      setStatus(action === "reset" ? "已建立新的訂閱連結。" : "已移除日期。");
    } catch (error) {
      setStatus(userMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const url = open && settings?.token ? `${location.origin}/api/calendar/${settings.token}` : null;
  return (
    <details className="mt-4 border-t border-line" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="flex min-h-11 cursor-pointer items-center font-bold">加入 Google／Apple 行事曆</summary>
      <p className="text-sm text-ink-soft">可在會員中心設定流月提醒，也可從擇日結果儲存日期。訂閱連結可讓持有者看到提醒，請自行保管。</p>
      {url && (
        <div className="mt-2 space-y-2">
          <label className="block text-sm">訂閱連結
            <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="mt-1 h-11 w-full rounded-lg border border-line bg-paper px-2 text-base" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={button} onClick={() => navigator.clipboard.writeText(url).then(() => setStatus("已複製訂閱連結。")).catch(() => setStatus("請選取並複製訂閱連結。"))}>複製連結</button>
            <a className={button} href={url.replace(/^https?:/, "webcal:")}>開啟 Apple 行事曆</a>
          </div>
          <p className="text-sm text-ink-soft">Google 日曆桌面版可在「其他日曆」旁按 ＋，選「透過網址」並貼上連結。Apple 行事曆也可以用「新增訂閱行事曆」貼上連結。</p>
        </div>
      )}
      <button type="button" className={`${button} mt-2`} disabled={busy || !settings} onClick={() => void change("reset")}>
        {url ? "重設訂閱連結" : "建立訂閱連結"}
      </button>
      {!!settings?.dates.length && (
        <ul className="mt-2 space-y-1">
          {settings.dates.map((date) => <li key={date} className="flex items-center justify-between gap-2 text-sm">{date}<button type="button" disabled={busy} className={button} onClick={() => void change("remove", date)}>移除日期</button></li>)}
        </ul>
      )}
      <p role="status" className="mt-1 text-sm text-ink-soft">{status}</p>
    </details>
  );
}
