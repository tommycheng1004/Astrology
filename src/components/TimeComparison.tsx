"use client";

import { useState } from "react";
import type { TimeComparisonFacts } from "@/lib/timeComparison";

type Candidate = { label: string; facts: TimeComparisonFacts };

export default function TimeComparison({ first, second }: { first: Candidate; second: Candidate }) {
  const [onlyChanged, setOnlyChanged] = useState(false);
  const rows = Object.entries(first.facts);
  const changed = rows.filter(([key, value]) => value !== second.facts[key]);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <p role="status" className="text-sm text-ink-soft">比對 {rows.length} 項，其中 {changed.length} 項不同</p>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyChanged} onChange={(e) => setOnlyChanged(e.target.checked)} className="size-4 accent-accent" />
          只看不同項目
        </label>
      </div>
      <table className="w-full table-fixed border-collapse text-left text-sm leading-relaxed">
        <caption className="sr-only">兩個出生時辰的本命盤對照</caption>
        <thead className="bg-surface-2">
          <tr>
            <th scope="col" className="w-1/4 p-2">盤面項目</th>
            <th scope="col" className="p-2">{first.label}</th>
            <th scope="col" className="p-2">{second.label}</th>
          </tr>
        </thead>
        <tbody>
          {(onlyChanged ? changed : rows).map(([key, value]) => (
            <tr key={key} className="border-b border-line align-top">
              <th scope="row" className="p-2 font-medium">{key}</th>
              <td className="break-words p-2">{value}</td>
              <td className={`break-words p-2 ${value !== second.facts[key] ? "font-medium text-accent" : ""}`}>{second.facts[key]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {onlyChanged && !changed.length && <p className="py-3 text-sm">這些項目在兩張盤上都相同。</p>}
      <details className="text-sm leading-relaxed text-ink-soft">
        <summary className="min-h-11 cursor-pointer py-3 font-medium text-accent">命宮、身宮和四化怎麼讀？</summary>
        <p>命宮是傳統上看個性和做事方式的位置。「主星」是這個位置上主要參考的星；寫著「借」時，表示這裡沒有主星，要參考正對面的宮位。</p>
        <p className="mt-2">身宮用來看生活重心。下面的祿、權、科、忌合稱「四化」，是依出生年加在星上的四種標記。「入官祿宮」就是這個標記落在看工作的地方。</p>
      </details>
    </div>
  );
}
