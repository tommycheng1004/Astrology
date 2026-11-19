"use client";

import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { accountServerSnapshot, accountSnapshot, openAccountDialog, subscribeAccount } from "@/lib/account";
import type { SavedBirth } from "@/components/BirthForm";
import { memberFetch } from "@/lib/memberFetch";
import { LIFE_EVENTS, type BirthRanking, type LifeEvent } from "@/lib/rectification";
import { shareHash } from "@/lib/shareLink";

const emptyEvent = (): LifeEvent => ({ year: 0, kind: "job" });
const emptyEvents = () => Array.from({ length: 5 }, emptyEvent);
const button = "min-h-11 rounded-lg border border-line px-3 text-sm font-bold text-accent disabled:opacity-60";

export default function EventRectification({ saved, onPick }: { saved: SavedBirth; onPick?: (timeIndex: number) => void }) {
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot, accountServerSnapshot);
  const [opened, setOpened] = useState(false);
  if (!account.enabled) return null;
  return (
    <details className="rounded-xl border border-line bg-surface px-4" onToggle={(e) => { if (e.currentTarget.open) setOpened(true); }}>
      <summary className="min-h-11 cursor-pointer py-3 font-serif font-bold text-ink">
        事件定盤 <span className="ml-1 font-sans text-xs font-normal text-ink-soft">用人生事件比較候選時辰</span>
      </summary>
      {account.user ? opened && <EventForm key={account.user.uid} saved={saved} onPick={onPick} /> : (
        <button type="button" onClick={openAccountDialog} className={`${button} mb-3`}>登入使用事件定盤</button>
      )}
    </details>
  );
}

function EventForm({ saved, onPick }: { saved: SavedBirth; onPick?: (timeIndex: number) => void }) {
  const [events, setEvents] = useState(emptyEvents);
  const [ranking, setRanking] = useState<BirthRanking | null>(null);
  const [busy, setBusy] = useState(true);
  const [status, setStatus] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    memberFetch("/api/rectification", { signal: controller.signal }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (!controller.signal.aborted && data.events.length) setEvents(data.events);
    }).catch((error: Error) => {
      if (!controller.signal.aborted) setStatus(error.message || "無法讀取事件資料。");
    }).finally(() => {
      if (!controller.signal.aborted) setBusy(false);
    });
    return () => controller.abort();
  }, []);

  function change(index: number, patch: Partial<LifeEvent>) {
    setEvents(events.map((event, i) => i === index ? { ...event, ...patch } : event));
    setRanking(null);
  }

  async function run(action: "POST" | "DELETE") {
    setBusy(true);
    setStatus("");
    try {
      const res = await memberFetch("/api/rectification", action === "DELETE" ? { method: action } : {
        method: action,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birth: shareHash(saved).slice(3), events }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "操作失敗，請再試一次。");
      if (action === "DELETE") {
        setEvents(emptyEvents());
        setRanking(null);
        setStatus("帳號中的事件資料已刪除。");
      } else {
        setRanking(data.ranking);
        setStatus("候選時辰已排序。");
      }
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void run("POST");
  }

  const inputClass = "min-h-11 w-full rounded-lg border border-line bg-paper px-2 text-base text-ink";
  return (
    <div className="space-y-4 pb-4 text-sm">
      <p className="text-ink-soft">填寫 5 到 10 件已發生的事件，比對十三個候選時段（含早子時及晚子時）的排盤結果。排序只供輔助判斷。事件類型與年份會儲存在你的帳號，可隨時刪除。</p>
      <form onSubmit={submit} className="space-y-3">
        <fieldset disabled={busy} className="space-y-2">
          <legend className="sr-only">事件年份與類型</legend>
          {events.map((event, index) => (
            <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] items-end gap-2">
              <label>年份<input type="number" inputMode="numeric" min={saved.input.year} value={event.year || ""} required onChange={(e) => change(index, { year: Number(e.target.value) })} className={inputClass} aria-label={`事件 ${index + 1} 年份`} /></label>
              <label>類型<select value={event.kind} onChange={(e) => change(index, { kind: e.target.value as LifeEvent["kind"] })} className={inputClass} aria-label={`事件 ${index + 1} 類型`}>
                {Object.entries(LIFE_EVENTS).map(([key, item]) => <option value={key} key={key}>{item.label}</option>)}
              </select></label>
              {events.length > 5 && <button type="button" className={button} onClick={() => { setEvents(events.filter((_, i) => i !== index)); setRanking(null); }} aria-label={`移除事件 ${index + 1}`}>移除</button>}
            </div>
          ))}
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={button} disabled={busy || events.length >= 10} onClick={() => setEvents([...events, emptyEvent()])}>新增事件</button>
          <button type="submit" className={button} disabled={busy}>儲存並比較時辰</button>
          <button type="button" className={button} disabled={busy} onClick={() => void run("DELETE")}>刪除事件資料</button>
        </div>
      </form>
      <p role="status">{busy ? "處理中…" : status}</p>
      {ranking && (
        <>
          <p className="text-ink-soft">每件事以流年與大限（或童限）的相應宮位為基礎，依四化微調；較難應對的事件以壓力跡象比對。分數只用來排列候選時辰。涉及健康，請諮詢專業人士。</p>
          <ol className="space-y-2">
            {ranking.map((candidate) => <li key={candidate.index} className="rounded-lg border border-line px-3">
              <details>
                <summary className="flex min-h-11 cursor-pointer items-center font-bold">{candidate.label}（{candidate.range}） · {candidate.score === null ? "無可比對事件" : `${candidate.score} 分`}</summary>
                <ul className="space-y-3 pb-3">
                  {candidate.evidence.map((event) => <li key={event.label}><strong>{event.label}{event.points === null ? "" : ` · ${event.points} 分`}</strong>{event.reasons.map((reason) => <p key={reason}>{reason}</p>)}</li>)}
                </ul>
                {onPick && <button className={`${button} mb-3`} type="button" onClick={() => onPick(candidate.index)}>用{candidate.label}排盤</button>}
              </details>
            </li>)}
          </ol>
        </>
      )}
    </div>
  );
}
