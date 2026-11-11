"use client";

import { useMemo, type ReactNode } from "react";
import FortuneList, { headlineOf } from "@/components/FortuneList";
import type { AspectResult } from "@/lib/fortune";
import { readOtherPalace } from "@/lib/palaceReadings";
import { analyzePatterns, type PatternResult } from "@/lib/patterns";
import { bodyPalaceText, soulPersona } from "@/lib/personality";
import { careerFit, peachBlossom, wealthType } from "@/lib/traits";
import type { Astrolabe } from "@/lib/ziwei";

type Props = {
  astrolabe: Astrolabe;
  natal: AspectResult[];
  onSelectPalace: (index: number) => void;
  onOpenFortune: () => void;
};

const SECTIONS = [
  { id: "sec-persona", label: "性格" },
  { id: "sec-patterns", label: "格局" },
  { id: "sec-fortune", label: "五運" },
  { id: "sec-palaces", label: "其他宮位" },
  { id: "sec-traits", label: "桃花財富職業" },
];

const OTHER_ORDER = ["命宮", "兄弟", "子女", "田宅", "福德", "父母", "遷移"];

export default function NatalReport({ astrolabe, natal, onSelectPalace, onOpenFortune }: Props) {
  const data = useMemo(
    () => ({
      persona: soulPersona(astrolabe),
      body: bodyPalaceText(astrolabe),
      patterns: sortPatterns(analyzePatterns(astrolabe)),
      others: OTHER_ORDER.map((n) => readOtherPalace(astrolabe, n)),
      peach: peachBlossom(astrolabe),
      wealth: wealthType(astrolabe),
      career: careerFit(astrolabe),
    }),
    [astrolabe],
  );
  const { persona, body, patterns, others, peach, wealth, career } = data;

  return (
    <div className="space-y-12">
      <nav aria-label="本頁段落" className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-2">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-sm text-ink-soft transition hover:border-accent hover:text-accent"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* 性格 */}
      <Section id="sec-persona" kicker="命宮主星" title="你的個性">
        {persona && (
          <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <p className="text-sm text-muted">
              {persona.borrowedFrom ? `命宮無主星，借${persona.borrowedFrom}的${persona.stars}` : `${persona.stars}坐命`}
            </p>
            <h4 className="mt-1 font-serif text-2xl font-bold text-accent">{persona.title}</h4>
            <p className="mt-3 max-w-[40em] text-base leading-[1.8] text-ink-soft">{persona.text}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <TraitList title="優點" tone="good" items={persona.strengths} />
              <TraitList title="要留意" tone="bad" items={persona.cautions} />
            </div>
            {body && (
              <div className="mt-5 rounded-xl bg-surface-2/60 p-4">
                <p className="text-sm font-medium text-ink">身宮在{body.palace}</p>
                <p className="mt-1 max-w-[40em] text-[15px] leading-relaxed text-ink-soft">{body.text.replace(/^[^：]+：/, "")}</p>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* 格局 */}
      <Section id="sec-patterns" kicker="格局判定" title="命盤格局">
        {patterns.length ? (
          <ul className="space-y-3">
            {patterns.map((p) => (
              <PatternCard key={p.name} pattern={p} />
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-line bg-surface p-5 text-base text-ink-soft">
            你的命盤沒有符合典型的格局。格局只是命盤的一種特徵，沒有格局不代表不好，很多人是靠後天努力走出自己的路。
          </p>
        )}
        <p className="mt-3 text-xs text-muted">
          格局依《紫微斗數全書》與通行說法判定；吉格遇化忌坐命或煞星會照會減分甚至破格。各家對格局條件的寬嚴略有不同，僅供參考。
        </p>
      </Section>

      {/* 本命五運 */}
      <Section id="sec-fortune" kicker="本命五運" title="先天的五大面向">
        <div className="mb-4 rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <p className="max-w-[32em] text-lg leading-relaxed text-ink">{headlineOf(natal, "natal")}</p>
          <button
            type="button"
            onClick={onOpenFortune}
            className="mt-3 inline-flex min-h-11 items-center text-[15px] font-medium text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
          >
            看今年和未來十年的運勢 →
          </button>
        </div>
        <FortuneList results={natal} onSelectPalace={onSelectPalace} />
      </Section>

      {/* 其他宮位 */}
      <Section id="sec-palaces" kicker="十二宮" title="其他宮位">
        <p className="mb-2 text-sm text-muted">命宮、兄弟、子女、田宅、福德、父母、遷移。五運相關的宮位在上方「五運」。</p>
        <FortuneList results={others} onSelectPalace={onSelectPalace} />
      </Section>

      {/* 桃花・財富・職業 */}
      <Section id="sec-traits" kicker="人生面向" title="桃花、財富與職業">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="桃花指數">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-serif text-xl font-bold text-accent">{peach.label}</span>
              <span className="text-sm text-muted tabular-nums">{peach.score}/100</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
              <div className="h-full rounded-full bg-accent" style={{ width: `${peach.score}%` }} />
            </div>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{peach.text}</p>
            {peach.found.length > 0 && (
              <p className="mt-2 text-sm text-muted">桃花星：{peach.found.join("；")}</p>
            )}
          </Card>
          <Card title="財富類型">
            <p className="font-serif text-xl font-bold text-accent">{wealth.name}</p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{wealth.text}</p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink">建議：{wealth.advice}</p>
            {wealth.notes.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                {wealth.notes.map((n) => (
                  <li key={n}>・{n}</li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-muted">依據：{wealth.basis}</p>
          </Card>
          <Card title="適合的行業">
            <ul className="flex flex-wrap gap-2">
              {career.fields.map((f) => (
                <li key={f} className="rounded-full bg-accent-soft px-3 py-1 text-sm text-accent">
                  {f}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{career.workStyle}</p>
            <p className="mt-2 text-xs text-muted">依據：{career.basis}</p>
          </Card>
        </div>
      </Section>
    </div>
  );
}

function Section({ id, kicker, title, children }: { id: string; kicker: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <p className="text-sm text-gold">{kicker}</p>
      <h3 id={`${id}-title`} className="mt-1 mb-4 font-serif text-2xl font-bold sm:text-3xl">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h4 className="mb-3 text-sm font-medium text-muted">{title}</h4>
      {children}
    </article>
  );
}

function TraitList({ title, tone, items }: { title: string; tone: "good" | "bad"; items: string[] }) {
  return (
    <div>
      <p className="text-sm font-medium text-ink">{title}</p>
      <ul className="mt-1.5 space-y-1">
        {items.map((t) => (
          <li key={t} className="flex gap-2 text-[15px] text-ink-soft">
            <span aria-hidden className={`text-[10px] leading-6 ${tone === "good" ? "text-lu" : "text-ji"}`}>
              {tone === "good" ? "▲" : "▼"}
            </span>
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  成格: "bg-lu/15 text-lu",
  有干擾: "bg-quan/10 text-quan",
  破格: "bg-surface-2 text-muted",
};
const KIND_STYLE: Record<string, string> = {
  吉格: "border-lu/40 text-lu",
  特殊: "border-line-strong text-ink-soft",
  凶格: "border-ji/40 text-ji",
};

function PatternCard({ pattern: p }: { pattern: PatternResult }) {
  return (
    <li className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-serif text-xl font-bold">{p.name}</span>
        <span className={`rounded-full border px-2 py-0.5 text-xs ${KIND_STYLE[p.kind]}`}>{p.kind}</span>
        {p.status && <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${STATUS_STYLE[p.status]}`}>{p.status}</span>}
      </div>
      <p className="mt-2 max-w-[40em] text-base leading-relaxed text-ink-soft">{p.meaning}</p>
      {p.reason && (
        <p className="mt-2 text-sm text-quan">
          {p.status === "破格" ? "破格原因：" : "干擾："}
          {p.reason}
        </p>
      )}
      <p className="mt-2 text-sm text-muted">成立條件：{p.condition}</p>
    </li>
  );
}

function sortPatterns(list: PatternResult[]) {
  const rank = (p: PatternResult) =>
    p.kind === "吉格" ? (p.status === "成格" ? 0 : p.status === "有干擾" ? 1 : 3) : p.kind === "特殊" ? 2 : 4;
  return [...list].sort((a, b) => rank(a) - rank(b));
}
