"use client";

import { useMemo, useState } from "react";
import BirthForm, { EMPTY_BIRTH, type SavedBirth } from "@/components/BirthForm";
import { GRADE_BADGE } from "@/components/FortuneList";
import { resolveBirth } from "@/lib/birthtime";
import { chartCaption, type SavedChart } from "@/lib/savedCharts";
import { RELATIONS, analyzeSynastry, type Crossing, type Relation } from "@/lib/synastry";
import { EngineLoadError, MUTAGEN_STYLE, computeAstrolabe, type Astrolabe } from "@/lib/ziwei";

type Partner = { saved: SavedBirth; astrolabe: Astrolabe };

export default function Synastry({
  astrolabe,
  selfName,
  savedCharts = [],
}: {
  astrolabe: Astrolabe;
  selfName: string;
  /** 「我的命盤」清單，可直接帶入對方的生辰 */
  savedCharts?: SavedChart[];
}) {
  const [relation, setRelation] = useState<Relation>("couple");
  const [partner, setPartner] = useState<Partner | null>(null);
  const [prefill, setPrefill] = useState<SavedChart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const partnerName = partner?.saved.input.name || "對方";
  const me = selfName || "你";
  const result = useMemo(
    () => (partner ? analyzeSynastry(astrolabe, partner.astrolabe, relation, me, partnerName) : null),
    [astrolabe, partner, relation, me, partnerName],
  );

  async function handleSubmit(saved: SavedBirth) {
    setLoading(true);
    setError(null);
    try {
      const resolved = resolveBirth(saved.input, saved);
      setPartner({ saved, astrolabe: await computeAstrolabe(resolved, saved.input.gender) });
    } catch (e) {
      setError(e instanceof EngineLoadError ? "排盤程式載入失敗，請確認網路連線後再按一次。" : "無法排出對方的命盤，請確認出生日期。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h3 className="font-serif text-2xl font-bold">合盤配對</h3>
        <p className="mt-1 max-w-[40em] text-[15px] text-ink-soft">
          輸入對方的生辰，看兩張命盤之間的四化互動、生肖與五行，了解彼此帶給對方什麼。
        </p>
        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-medium text-ink-soft">你們的關係</legend>
          <div className="grid h-12 max-w-md grid-cols-3 rounded-lg border border-line bg-paper/60 p-1">
            {RELATIONS.map((r) => (
              <label
                key={r.id}
                className="flex cursor-pointer items-center justify-center rounded-md text-[15px] text-ink-soft transition has-[:checked]:bg-surface has-[:checked]:font-bold has-[:checked]:text-accent has-[:checked]:shadow-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
              >
                <input
                  type="radio"
                  name="relation"
                  value={r.id}
                  checked={relation === r.id}
                  onChange={() => setRelation(r.id)}
                  className="sr-only"
                />
                {r.label}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[400px_minmax(0,1fr)]">
        <div>
          {savedCharts.length > 0 && (
            <label className="mb-3 block">
              <span className="mb-2 block text-sm font-medium text-ink-soft">從我的命盤帶入</span>
              <span className="relative block">
                <select
                  value={prefill?.id ?? ""}
                  onChange={(e) => {
                    const picked = savedCharts.find((c) => c.id === e.target.value) ?? null;
                    setPrefill(picked);
                    if (picked) handleSubmit(picked.saved);
                  }}
                  className="h-11 w-full appearance-none rounded-lg border border-line bg-surface px-3 pr-8 text-base text-ink"
                >
                  <option value="">選擇一張命盤…</option>
                  {savedCharts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.saved.input.name || "未命名"}（{chartCaption(c.saved)}）
                    </option>
                  ))}
                </select>
                <svg aria-hidden viewBox="0 0 16 16" className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted">
                  <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </span>
            </label>
          )}
          <BirthForm
            key={prefill?.id ?? "manual"}
            loading={loading}
            initial={prefill?.saved ?? partner?.saved ?? EMPTY_BIRTH}
            onSubmit={handleSubmit}
            title="對方的生辰"
            submitLabel="開始合盤"
            headingLevel="h4"
            canCompare={false}
          />
          {error && (
            <p role="alert" className="mt-3 rounded-lg border border-ji/30 bg-ji/10 px-4 py-3 text-sm text-ji">
              {error}
            </p>
          )}
        </div>

        {result ? (
          <div className="space-y-4" aria-live="polite">
            <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <p className="text-sm text-muted">
                {me} × {partnerName}・{RELATIONS.find((r) => r.id === relation)!.label}
              </p>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <span className="font-serif text-5xl font-bold tabular-nums">{result.score}</span>
                <span className="pb-1 text-sm text-muted">契合度</span>
                <span className={`mb-1 rounded-full px-3 py-1 text-base font-bold ${GRADE_BADGE[result.grade]}`}>{result.grade}</span>
              </div>
              <p className="mt-3 max-w-[32em] text-lg leading-relaxed text-ink">{result.headline}</p>
            </section>

            <div className="grid gap-4 xl:grid-cols-2">
              <CrossingCard title={`${me}帶給${partnerName}的`} receiver={partnerName} items={result.aToB} />
              <CrossingCard title={`${partnerName}帶給${me}的`} receiver={me} items={result.bToA} />
            </div>

            <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <h4 className="font-serif text-lg font-bold">命盤呼應</h4>
              <ul className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-soft">
                {result.echoes.map((t) => (
                  <li key={t}>{t}</li>
                ))}
                <li>
                  <span className="text-sm text-muted">生肖：</span>
                  {result.zodiac}
                </li>
                <li>
                  <span className="text-sm text-muted">五行局：</span>
                  {result.element}
                </li>
              </ul>
            </section>

            <p className="text-xs text-muted">
              「四化互入」是看一方的生年四化星落在另一方命盤的哪一宮，代表這個人帶給對方的影響。合盤僅供參考，關係的好壞仍取決於彼此的經營。
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line-strong p-8 text-center text-ink-soft">
            <p className="font-serif text-lg">輸入對方的生辰後，這裡會顯示合盤結果</p>
            <p className="mt-2 text-sm text-muted">包含四化互入、命盤呼應、生肖與五行局</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CrossingCard({ title, receiver, items }: { title: string; receiver: string; items: Crossing[] }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h4 className="font-serif text-lg font-bold">{title}</h4>
      <ul className="mt-3 space-y-3">
        {items.map((c) => (
          <li key={c.mutagen} className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            <span className={`row-span-2 mt-0.5 h-fit rounded px-1.5 text-sm leading-6 font-bold ${MUTAGEN_STYLE[c.mutagen]}`}>
              {c.mutagen}
            </span>
            <span className="text-sm text-muted">
              {c.star}化{c.mutagen} → {receiver}的{c.palace}
            </span>
            <span className="text-[15px] leading-relaxed text-ink-soft">{c.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
