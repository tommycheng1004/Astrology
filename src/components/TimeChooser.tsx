"use client";

import { useEffect, useRef, useState } from "react";
import type { SavedBirth } from "@/components/BirthForm";
import TimeComparison from "@/components/TimeComparison";
import EventRectification from "@/components/EventRectification";
import type { TimeChoice } from "@/lib/buildChart";

/**
 * 不知道出生時辰：列出每個時辰的命宮主星與個性，讓使用者挑最像自己的。
 * 這是民間常見的「定盤」做法之一，挑完仍建議向家人或出生證明確認。
 */
export default function TimeChooser({
  choices,
  saved,
  loading,
  onPick,
  onCancel,
}: {
  choices: TimeChoice[];
  saved: SavedBirth;
  loading: boolean;
  onPick: (timeIndex: number) => void;
  onCancel: () => void;
}) {
  const [firstIndex, setFirstIndex] = useState(choices[0].timeIndex);
  const [secondIndex, setSecondIndex] = useState(choices[choices.length - 1].timeIndex);
  const first = choices.find((c) => c.timeIndex === firstIndex)!;
  const second = choices.find((c) => c.timeIndex === secondIndex)!;
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    ref.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-labelledby="time-chooser-title"
      className="mx-auto w-full max-w-6xl scroll-mt-2 px-3 pb-12 outline-none sm:px-6 md:pb-16"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <h1 id="time-chooser-title" className="font-serif text-2xl font-bold tracking-wide sm:text-3xl">
            比對出生時辰
          </h1>
          <p className="mt-2 max-w-[40em] text-[15px] leading-relaxed text-ink-soft">
            選兩個可能的時辰，看換了時辰會改變哪些盤面資料。若要確認實際出生時間，可再核對出生紀錄。
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="h-11 rounded-lg border border-line bg-surface px-4 text-sm text-ink-soft transition hover:border-accent hover:text-accent"
        >
          返回修改
        </button>
      </div>

      <section aria-label="候選時辰對照" className="mt-5 rounded-2xl border border-line bg-surface p-4 sm:p-6">
        <h2 className="font-serif text-xl font-bold">候選時辰對照</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[first, second].map((choice, index) => (
            <label key={index} className="min-w-0 text-sm font-medium">
              {index === 0 ? "第一個時辰" : "第二個時辰"}
              <select
                className="mt-1 block min-h-11 w-full rounded-lg border border-line-strong bg-surface px-2 text-base"
                value={choice.timeIndex}
                onChange={(e) => (index === 0 ? setFirstIndex : setSecondIndex)(Number(e.target.value))}
              >
                {choices.map((c) => (
                  <option key={c.timeIndex} value={c.timeIndex} disabled={c.timeIndex === (index === 0 ? secondIndex : firstIndex)}>
                    {c.label}（{c.range}）
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <TimeComparison first={first} second={second} />
        <div className="mt-4 flex flex-wrap gap-2">
          {[first, second].map((c) => (
            <button key={c.timeIndex} type="button" className="action-secondary" disabled={loading} onClick={() => onPick(c.timeIndex)}>
              查看{c.label}命盤
            </button>
          ))}
        </div>
      </section>
      <div className="mt-6"><EventRectification saved={saved} onPick={onPick} /></div>
      <ul className="mt-6 grid gap-3 md:grid-cols-2">
        {choices.map((c) => (
          <li key={c.timeIndex} className="flex flex-col rounded-2xl border border-line bg-surface p-5">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-serif text-xl font-bold">{c.label}</span>
              <span className="text-sm text-muted tabular-nums">{c.range}</span>
            </p>
            <p className="mt-1 text-sm text-muted">
              命宮在{c.soul}
              {c.body && `・${c.body}`}
            </p>
            {c.title && <p className="mt-3 font-serif text-lg font-bold text-accent">{c.title}</p>}
            <p className="mt-1 flex-1 text-[15px] leading-relaxed text-ink-soft">{c.text}</p>
            <button
              type="button"
              disabled={loading}
              onClick={() => onPick(c.timeIndex)}
              className="mt-4 h-11 self-start rounded-lg border border-accent bg-surface px-4 font-medium text-accent transition hover:bg-accent hover:text-surface disabled:opacity-60"
            >
              用{c.label}排盤
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
