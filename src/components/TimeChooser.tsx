"use client";

import { useEffect, useRef } from "react";
import type { TimeChoice } from "@/lib/buildChart";

/**
 * 不知道出生時辰：列出每個時辰的命宮主星與個性，讓使用者挑最像自己的。
 * 這是民間常見的「定盤」做法之一，挑完仍建議向家人或出生證明確認。
 */
export default function TimeChooser({
  choices,
  loading,
  onPick,
  onCancel,
}: {
  choices: TimeChoice[];
  loading: boolean;
  onPick: (timeIndex: number) => void;
  onCancel: () => void;
}) {
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
          <h2 id="time-chooser-title" className="font-serif text-2xl font-bold tracking-wide sm:text-3xl">
            哪個時辰最像你？
          </h2>
          <p className="mt-2 max-w-[40em] text-[15px] leading-relaxed text-ink-soft">
            時辰決定命宮在哪裡，也就決定了命宮主星。讀讀看下面的個性描述，挑一個最像自己的；拿不定主意時，可以請熟悉你的人一起看。之後確認了出生時間，再回來重新排盤。
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
