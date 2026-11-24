"use client";

import { useId, useState } from "react";
import { GLOSSARY_GROUPS, glossParts, type GlossaryEntry, type GlossPart } from "@/content/glossary";

/**
 * 顯示解析文字，術語加虛線底線，點一下在原地展開白話解釋（不用浮動視窗，手機上不會跑出畫面）。
 * 傳 text 時自行切分；同一張卡片要共用「只標第一次」時，改用 glossParts 切好再傳 parts。
 */
export default function GlossText({ text, parts }: { text?: string; parts?: GlossPart[] }) {
  const list = parts ?? glossParts([text ?? ""])[0];
  return (
    <>
      {list.map((part, i) => (typeof part === "string" ? part : <Term key={i} text={part.text} entry={part.entry} />))}
    </>
  );
}

function Term({ text, entry }: { text: string; entry: GlossaryEntry }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="cursor-help text-inherit underline decoration-accent/50 decoration-dotted decoration-[1.5px] underline-offset-[5px] transition hover:text-accent hover:decoration-accent focus-visible:text-accent"
      >
        {text}
      </button>
      {open && (
        <span id={id} role="note" className="mx-0.5 rounded-md bg-accent-soft px-1.5 py-0.5 text-[0.9em] text-ink [box-decoration-break:clone]">
          {entry.plain}
        </span>
      )}
    </>
  );
}

/** 「這張盤用到的名詞」：一次列出，給想先看懂再讀的人 */
export function GlossaryList({ entries }: { entries: GlossaryEntry[] }) {
  if (!entries.length) return null;
  return (
    <details className="group rounded-2xl border border-line bg-surface">
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-5 py-3 font-medium text-ink sm:px-6">
        <span>
          看不懂的名詞？<span className="ml-1 text-sm font-normal text-muted">這張盤用到 {entries.length} 個術語，這裡一次說明</span>
        </span>
        <span aria-hidden className="text-muted transition group-open:rotate-180">⌄</span>
      </summary>
      <div className="space-y-5 border-t border-line/60 px-5 pt-4 pb-5 sm:px-6">
        {GLOSSARY_GROUPS.map((group) => {
          const items = entries.filter((e) => e.group === group);
          if (!items.length) return null;
          return (
            <section key={group}>
              <h3 className="text-sm font-bold text-gold">{group}</h3>
              <dl className="mt-2 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {items.map((e) => (
                  <div key={e.term}>
                    <dt className="font-medium text-accent">{e.term}</dt>
                    <dd className="mt-0.5 text-[15px] leading-relaxed text-ink-soft">{e.plain}</dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })}
      </div>
    </details>
  );
}
