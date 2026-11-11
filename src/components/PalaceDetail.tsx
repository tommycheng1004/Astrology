"use client";

import type { IFunctionalHoroscope } from "iztro/lib/astro/FunctionalHoroscope";
import type { IFunctionalStar } from "iztro/lib/star/FunctionalStar";
import { flanksOf, flightsOf } from "@/lib/chartExtras";
import { LEVEL_NAME, LEVELS, lensMutagens, type Lens } from "@/lib/periods";
import { MUTAGEN_OUTLINE, MUTAGEN_STYLE, palaceName, palaceTitle, surroundedIndexes, type Astrolabe } from "@/lib/ziwei";

type Props = {
  astrolabe: Astrolabe;
  selectedIndex: number;
  horoscope: IFunctionalHoroscope | null;
  lens: Lens;
  onSelect: (index: number) => void;
  /** 放在底部面板裡時不需要外框 */
  bare?: boolean;
};

const MINOR_TYPE_LABEL: Record<string, string> = {
  soft: "吉",
  tough: "煞",
  lucun: "祿",
  tianma: "馬",
  flower: "桃",
  helper: "解",
};

export default function PalaceDetail({ astrolabe, selectedIndex, horoscope, lens, onSelect, bare }: Props) {
  const palace = astrolabe.palaces[selectedIndex];
  const flow = lensMutagens(horoscope, lens);
  const flowName = lens === "natal" ? "" : LEVEL_NAME[lens];
  const layerNames = horoscope
    ? LEVELS.map((l) => ({ level: l, name: horoscope[l].palaceNames[selectedIndex] }))
    : [];
  const rel = surroundedIndexes(selectedIndex);
  const flights = flightsOf(astrolabe, selectedIndex);
  const flanks = flanksOf(astrolabe, selectedIndex);
  const related = [
    { role: "對宮", index: rel.opposite },
    { role: "三合", index: rel.trineA },
    { role: "三合", index: rel.trineB },
  ];

  return (
    <section className={bare ? "px-5 pt-1 pb-2 sm:px-6" : "rounded-xl border border-line bg-surface p-5 sm:p-6"}>
      {/* 換宮位時只播報宮名，不把整塊詳情重唸一次 */}
      <p className="sr-only" aria-live="polite">
        {palaceTitle(palace.name)}詳情
      </p>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-muted">
            {palace.heavenlyStem}
            {palace.earthlyBranch}宮
          </p>
          <h3 className="mt-1 font-serif text-2xl font-bold text-accent">
            {palaceTitle(palace.name)}
            {palace.name === "僕役" && <span className="ml-2 align-middle text-sm font-medium text-muted">古稱僕役宮</span>}
          </h3>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5 pt-1">
          {palace.isBodyPalace && <Badge className="bg-gold text-surface">身宮</Badge>}
          {palace.isOriginalPalace && <Badge className="bg-gold/15 text-gold">來因宮</Badge>}
          {flights
            .filter((f) => f.self)
            .map((f) => (
              <Badge key={f.mutagen} className={MUTAGEN_OUTLINE[f.mutagen] + " border"}>
                自化{f.mutagen}
              </Badge>
            ))}
          {layerNames
            .filter((l) => l.name === "命宮")
            .map((l) => (
              <Badge key={l.level} className={l.level === lens ? "bg-accent text-surface" : "bg-accent-soft text-accent"}>
                {LEVEL_NAME[l.level]}命宮
              </Badge>
            ))}
        </div>
      </header>

      <dl className="mt-5 space-y-4">
        <Row label="主星">
          {palace.majorStars.length ? (
            <StarList stars={palace.majorStars} strong flow={flow} flowName={flowName} />
          ) : (
            <span className="text-sm text-muted">
              無主星（空宮），借對宮 {palaceTitle(astrolabe.palaces[rel.opposite].name)} 主星論
            </span>
          )}
        </Row>
        <Row label="輔星">
          {palace.minorStars.length ? (
            <StarList stars={palace.minorStars} showType flow={flow} flowName={flowName} />
          ) : (
            <span className="text-sm text-muted">—</span>
          )}
        </Row>
        <Row label="雜曜">
          {palace.adjectiveStars.length ? (
            <p className="font-serif text-sm leading-relaxed text-ink-soft">
              {palace.adjectiveStars.map((s) => s.name).join("、")}
            </p>
          ) : (
            <span className="text-sm text-muted">—</span>
          )}
        </Row>
        {layerNames.length > 0 && (
          <Row label="運限">
            <p className="text-sm leading-relaxed text-ink-soft">
              {layerNames.map((l, i) => (
                <span key={l.level} className={l.level === lens ? "font-bold text-accent" : ""}>
                  {i > 0 && "・"}
                  {LEVEL_NAME[l.level]}
                  {palaceName(l.name)}
                </span>
              ))}
            </p>
          </Row>
        )}
        <Row label="宮干四化">
          <ul className="space-y-1 text-sm text-ink-soft">
            {flights.map((f) => (
              <li key={f.mutagen} className="flex flex-wrap items-center gap-x-1.5">
                <span className={`rounded px-1 text-xs leading-5 font-bold ${MUTAGEN_STYLE[f.mutagen]}`}>{f.mutagen}</span>
                <span className="font-serif">{f.star}</span>
                <span aria-hidden className="text-muted">→</span>
                {f.to ? (
                  <button
                    type="button"
                    onClick={() => onSelect(f.to!.index)}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center px-1 font-medium text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
                  >
                    {palaceTitle(f.to.name)}
                  </button>
                ) : (
                  <span className="text-muted">盤上無此星</span>
                )}
                {f.self && <span className="text-xs text-gold">（自化）</span>}
                {f.opposite && f.mutagen === "忌" && <span className="text-xs text-ji">（忌沖本宮）</span>}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-muted">本宮天干（{palace.heavenlyStem}）化出的四化飛入哪一宮，飛星派用來看宮位之間的因果。</p>
        </Row>
        <Row label="夾宮">
          {flanks.length ? (
            <ul className="space-y-1 text-sm text-ink-soft">
              {flanks.map((f) => (
                <li key={f.label}>
                  <span className={`font-medium ${f.tone === "good" ? "text-lu" : f.tone === "bad" ? "text-ji" : ""}`}>{f.label}</span>
                  ：{f.note}
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-sm text-muted">—</span>
          )}
        </Row>
        <Row label="神煞">
          <p className="text-sm text-ink-soft">
            長生 {palace.changsheng12}・博士 {palace.boshi12}・將前 {palace.jiangqian12}・歲前 {palace.suiqian12}
          </p>
        </Row>
        <Row label="大限">
          <p className="text-sm text-ink-soft tabular-nums">
            {palace.decadal.range[0]}–{palace.decadal.range[1]} 歲（{palace.decadal.heavenlyStem}
            {palace.decadal.earthlyBranch}）
          </p>
        </Row>
        <Row label="小限">
          <p className="text-sm text-ink-soft tabular-nums">{palace.ages.slice(0, 8).join("、")} 歲…</p>
        </Row>
      </dl>

      <div className="mt-6 border-t border-line pt-4">
        <p className="text-xs tracking-[0.2em] text-muted">三方四正</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {related.map((r) => {
            const p = astrolabe.palaces[r.index];
            return (
              <button
                key={r.index}
                type="button"
                onClick={() => onSelect(r.index)}
                className="rounded-lg border border-line bg-paper/50 px-2 py-2 text-center transition hover:border-accent hover:bg-accent-soft"
              >
                <span className="block text-xs text-muted">{r.role}</span>
                <span className="block font-serif text-sm font-bold">{palaceTitle(p.name)}</span>
                <span className="mt-0.5 block truncate text-xs text-star-major">
                  {p.majorStars.map((s) => s.name).join(" ") || "空宮"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[3.75rem_1fr] items-baseline gap-3">
      <dt className="text-xs tracking-[0.1em] text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function StarList({
  stars,
  strong,
  showType,
  flow,
  flowName,
}: {
  stars: IFunctionalStar[];
  strong?: boolean;
  showType?: boolean;
  flow: Map<string, string>;
  flowName: string;
}) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
      {stars.map((s) => (
        <li key={s.name} className="inline-flex items-center gap-1">
          <span
            className={`font-serif ${
              strong
                ? "text-lg font-bold text-star-major"
                : s.type === "tough"
                  ? "text-[15px] text-star-tough"
                  : "text-[15px] text-star-soft"
            }`}
          >
            {s.name}
          </span>
          {s.brightness && <span className="text-xs text-muted">{s.brightness}</span>}
          {s.mutagen && (
            <span className={`rounded px-1 text-xs leading-4 font-bold ${MUTAGEN_STYLE[s.mutagen]}`}>
              化{s.mutagen}
            </span>
          )}
          {flow.get(s.name) && (
            <span className={`rounded border px-1 text-xs leading-4 font-bold ${MUTAGEN_OUTLINE[flow.get(s.name)!]}`}>
              {flowName}化{flow.get(s.name)}
            </span>
          )}
          {showType && MINOR_TYPE_LABEL[s.type] && (
            <span className="text-xs text-muted">({MINOR_TYPE_LABEL[s.type]})</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{children}</span>;
}
