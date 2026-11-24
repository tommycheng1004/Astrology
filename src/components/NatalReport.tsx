"use client";

import { useMemo, type ReactNode } from "react";
import FortuneList, { headlineOf } from "@/components/FortuneList";
import GlossText, { GlossaryList } from "@/components/GlossText";
import { glossParts, termsIn } from "@/content/glossary";
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
  { id: "sec-fortune", label: "五大生活面向" },
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
  const terms = useMemo(
    () =>
      termsIn([
        persona?.text ?? "",
        body?.text ?? "",
        ...patterns.flatMap((p) => [p.name, p.status ?? "", p.meaning, p.condition, p.reason ?? ""]),
        ...[...natal, ...others].flatMap((r) => r.insights.map((x) => x.text)),
        ...peach.found,
        ...wealth.notes,
        wealth.basis,
        career.workStyle,
        career.basis,
      ]),
    [persona, body, patterns, natal, others, peach, wealth, career],
  );

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
      <p className="-mt-8 text-sm text-muted">
        解析保留紫微斗數的專有名詞；<span className="underline decoration-accent/50 decoration-dotted decoration-[1.5px] underline-offset-[5px]">虛線底線</span>的詞點一下，就會出現白話解釋。
      </p>

      {/* 性格 */}
      <Section id="sec-persona" kicker="命宮主星" title="你的個性">
        {persona && (
          <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <p className="text-sm text-muted">
              <GlossText text={persona.borrowedFrom ? `命宮沒有主星，解讀個性時參考對面${persona.borrowedFrom}的${persona.stars}` : `命宮裡的主星是${persona.stars}`} />
            </p>
            <h3 className="mt-1 font-serif text-2xl font-bold text-accent">{persona.title}</h3>
            <p className="mt-3 max-w-[40em] text-base leading-[1.8] text-ink-soft"><GlossText text={persona.text} /></p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <TraitList title="優點" tone="good" items={persona.strengths} />
              <TraitList title="要留意" tone="bad" items={persona.cautions} />
            </div>
            {body && (
              <div className="mt-5 rounded-xl bg-surface-2/60 p-4">
                <p className="text-sm font-medium text-ink"><GlossText text={`生活重心（身宮在${body.palace}）`} /></p>
                <p className="mt-1 max-w-[40em] text-[15px] leading-relaxed text-ink-soft"><GlossText text={body.text.replace(/^[^：]+：/, "")} /></p>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* 格局 */}
      <Section id="sec-patterns" kicker="命盤格局" title="這些星放在一起，傳統上怎麼解讀？">
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
          「格局」是古人替特定星曜組合取的名字。本站依《紫微斗數全書》與通行說法判讀；各派採用的條件可能不同。
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
        <p className="mb-2 text-sm text-muted">命宮、兄弟、子女、田宅、福德、父母、遷移。想看工作、金錢、感情、健康或人際關係，可回到上方的「五大生活面向」。</p>
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
              <p className="mt-2 text-sm text-muted"><GlossText text={`桃花星：${peach.found.join("；")}`} /></p>
            )}
          </Card>
          <Card title="財富類型">
            <p className="font-serif text-xl font-bold text-accent">{wealth.name}</p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{wealth.text}</p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink">建議：{wealth.advice}</p>
            {wealth.notes.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                {glossParts(wealth.notes).map((parts, i) => (
                  <li key={wealth.notes[i]}>・<GlossText parts={parts} /></li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-muted">依據：<GlossText text={wealth.basis} /></p>
          </Card>
          <Card title="適合的行業">
            <ul className="flex flex-wrap gap-2">
              {career.fields.map((f) => (
                <li key={f} className="rounded-full bg-accent-soft px-3 py-1 text-sm text-accent">
                  {f}
                </li>
              ))}
            </ul>
            {(() => {
              const [style, basis] = glossParts([career.workStyle, career.basis]);
              return (
                <>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-soft"><GlossText parts={style} /></p>
                  <p className="mt-2 text-xs text-muted">依據：<GlossText parts={basis} /></p>
                </>
              );
            })()}
          </Card>
        </div>
      </Section>

      <GlossaryList entries={terms} />
    </div>
  );
}

function Section({ id, kicker, title, children }: { id: string; kicker: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <p className="text-sm text-gold">{kicker}</p>
      <h2 id={`${id}-title`} className="mt-1 mb-4 font-serif text-2xl font-bold sm:text-3xl">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h3 className="mb-3 text-sm font-medium text-muted">{title}</h3>
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
  const [meaning, condition, reason] = glossParts([p.meaning, p.condition, p.reason ?? ""]);
  return (
    <li className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-serif text-xl font-bold">{p.name}</span>
        <span className={`rounded-full border px-2 py-0.5 text-xs ${KIND_STYLE[p.kind]}`}>{p.kind}</span>
        {p.status && <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${STATUS_STYLE[p.status]}`}>{p.status}</span>}
      </div>
      <p className="mt-2 max-w-[40em] text-base leading-relaxed text-ink-soft"><GlossText parts={meaning} /></p>
      <details className="mt-1 text-sm text-ink-soft">
        <summary className="min-h-11 cursor-pointer py-3 font-medium text-accent">為什麼這張盤有這個格局？</summary>
        <p><GlossText parts={condition} /></p>
        {p.status && <p className="mt-2 text-muted">「{p.status}」的意思：{p.status === "成格" ? "條件都齊了，效果比較完整。" : p.status === "破格" ? "有這個格局，但被其他不利的星干擾，效果打了折扣。" : "條件大致成立，但有些星會削弱它的效果。"}</p>}
        {p.reason && <p className="mt-2">{p.status === "破格" ? "這張盤還有其他星曜，使原本的有利條件減弱。" : "以下星曜也會影響這個組合。"}<GlossText parts={reason} /></p>}
      </details>
    </li>
  );
}

function sortPatterns(list: PatternResult[]) {
  const rank = (p: PatternResult) =>
    p.kind === "吉格" ? (p.status === "成格" ? 0 : p.status === "有干擾" ? 1 : 3) : p.kind === "特殊" ? 2 : 4;
  return [...list].sort((a, b) => rank(a) - rank(b));
}
