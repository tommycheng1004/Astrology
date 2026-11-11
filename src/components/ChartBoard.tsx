"use client";

import type { IFunctionalHoroscope } from "iztro/lib/astro/FunctionalHoroscope";
import type { IFunctionalPalace } from "iztro/lib/astro/FunctionalPalace";
import type { IFunctionalStar } from "iztro/lib/star/FunctionalStar";
import { LAYER_PREFIX, LEVELS, lensMutagens, type Lens, type Level } from "@/lib/periods";
import {
  GRID_POSITION,
  MUTAGEN_OUTLINE,
  MUTAGEN_STYLE,
  PALACE_SHORT,
  palaceName,
  surroundedIndexes,
  toTraditionalLunar,
  type Astrolabe,
  type BirthInput,
} from "@/lib/ziwei";

type Props = {
  astrolabe: Astrolabe;
  input: BirthInput;
  selectedIndex: number;
  horoscope: IFunctionalHoroscope | null;
  lens: Lens;
  onSelect: (index: number) => void;
};

export default function ChartBoard({ astrolabe, input, selectedIndex, horoscope, lens, onSelect }: Props) {
  const rel = surroundedIndexes(selectedIndex);
  const flowMutagens = lensMutagens(horoscope, lens);

  function relationOf(index: number) {
    if (index === rel.target) return "target";
    if (index === rel.opposite) return "opposite";
    if (index === rel.trineA || index === rel.trineB) return "trine";
    return null;
  }

  return (
    // 寬高比只是預設尺寸：列高用 1fr（最小為內容高度）、外框用 overflow-clip（不是捲動容器），
    // 星曜特別多的宮位會把那一列與整張盤撐高，而不是被裁掉
    <div data-chart-board className="relative grid aspect-[3/4] grid-cols-4 grid-rows-[repeat(4,1fr)] gap-px overflow-clip rounded-xl border border-line-strong bg-line-strong/70 sm:aspect-[5/4]">
      {astrolabe.palaces.map((palace) => (
        <PalaceCell
          key={palace.index}
          palace={palace}
          relation={relationOf(palace.index)}
          layers={horoscope ? LEVELS.map((level) => ({ level, name: horoscope[level].palaceNames[palace.index] })) : []}
          lens={lens}
          flowMutagens={flowMutagens}
          onSelect={onSelect}
        />
      ))}

      <CenterPanel astrolabe={astrolabe} input={input} />
      <SurroundLines selectedIndex={selectedIndex} />
    </div>
  );
}

function PalaceCell({
  palace,
  relation,
  layers,
  lens,
  flowMutagens,
  onSelect,
}: {
  palace: IFunctionalPalace;
  relation: "target" | "opposite" | "trine" | null;
  layers: { level: Level; name: string }[];
  lens: Lens;
  flowMutagens: Map<string, string>;
  onSelect: (index: number) => void;
}) {
  const pos = GRID_POSITION[palace.index];
  const isSoul = palace.name === "命宮";
  const majors = palace.majorStars.filter((s) => s.scope === "origin");
  const minors = palace.minorStars;

  const tone =
    relation === "target"
      ? "bg-accent-soft"
      : relation
        ? "bg-[color-mix(in_oklab,var(--accent-soft)_45%,var(--surface))]"
        : "bg-surface hover:bg-surface-2/60";

  const lensLayer = layers.find((l) => l.level === lens);
  const spoken = (s: IFunctionalStar) => `${s.name}${s.brightness ? `（${s.brightness}）` : ""}${s.mutagen ? `化${s.mutagen}` : ""}`;
  const label = [
    `${palaceName(palace.name)}${palace.isBodyPalace ? "（身宮）" : ""}`,
    `${palace.heavenlyStem}${palace.earthlyBranch}`,
    majors.length ? `主星${majors.map(spoken).join("、")}` : "無主星",
    minors.length ? `輔星${minors.map(spoken).join("、")}` : null,
    `大限 ${palace.decadal.range[0]} 到 ${palace.decadal.range[1]} 歲`,
    ...layers.map((l) => `${LAYER_PREFIX[l.level]}${palaceName(l.name)}`),
  ]
    .filter(Boolean)
    .join("，");

  return (
    <button
      type="button"
      onClick={() => onSelect(palace.index)}
      aria-pressed={relation === "target"}
      style={{ gridRow: pos.row + 1, gridColumn: pos.col + 1 }}
      className={`group relative flex min-w-0 flex-col p-1 text-left transition-colors sm:p-2 ${tone} ${
        relation === "target" ? "z-10 shadow-[inset_0_0_0_2px_var(--accent)]" : ""
      }`}
    >
      {/* 給螢幕閱讀器與語音控制的名稱，以宮名開頭；下方視覺內容太密，不逐字朗讀 */}
      <span className="sr-only">{label}</span>

      {/* 星曜：直書，主星在前 */}
      {/* 不設 overflow：最小高度就是星曜的高度，整列會跟著撐高，星曜不會被裁掉或壓到下方的宮名 */}
      <div data-stars aria-hidden className="flex flex-1 flex-wrap content-start gap-x-0.5 gap-y-1 sm:gap-x-1">
        {majors.map((s) => (
          <StarColumn key={s.name} star={s} kind="major" flow={flowMutagens.get(s.name)} />
        ))}
        {minors.map((s) => (
          <StarColumn key={s.name} star={s} kind="minor" flow={flowMutagens.get(s.name)} />
        ))}
        {palace.adjectiveStars.map((s) => (
          <StarColumn key={s.name} star={s} kind="adjective" />
        ))}
      </div>

      {/* 下方：神煞、大限、疊盤宮名、宮名 */}
      <div aria-hidden className="mt-1 space-y-0.5 text-[10px] leading-tight text-muted sm:text-[11px]">
        <div className="hidden justify-between gap-1 md:flex">
          <span className="truncate">
            {palace.changsheng12}・{palace.boshi12}
          </span>
          <span className="truncate">
            {palace.jiangqian12}・{palace.suiqian12}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1">
          <span className="tabular-nums">
            {palace.decadal.range[0]}–{palace.decadal.range[1]}
          </span>
          {lensLayer && (
            <span className="rounded-sm bg-accent px-1 font-serif leading-4 text-surface">
              {LAYER_PREFIX[lensLayer.level]}
              {PALACE_SHORT[lensLayer.name]}
            </span>
          )}
        </div>
      </div>

      <div aria-hidden className="mt-1 flex items-end justify-between gap-1 border-t border-line/70 pt-1">
        <span className="flex items-center gap-1">
          <span
            className={`font-serif text-[13px] font-bold tracking-wide sm:text-[15px] ${
              isSoul || relation === "target" ? "text-accent" : "text-ink"
            }`}
          >
            {palaceName(palace.name)}
          </span>
          {palace.isBodyPalace && (
            <span className="rounded-sm bg-gold px-0.5 text-[10px] leading-4 font-bold text-surface">身</span>
          )}
          {palace.isOriginalPalace && (
            <span title="來因宮" className="rounded-sm border border-gold px-0.5 text-[10px] leading-[14px] font-bold text-gold">
              因
            </span>
          )}
        </span>
        <span className="font-serif text-[11px] text-ink-soft sm:text-[13px]">
          {palace.heavenlyStem}
          {palace.earthlyBranch}
        </span>
      </div>
    </button>
  );
}

function StarColumn({
  star,
  kind,
  flow,
}: {
  star: IFunctionalStar;
  kind: "major" | "minor" | "adjective";
  flow?: string;
}) {
  const color =
    kind === "major"
      ? "text-star-major font-bold"
      : kind === "minor"
        ? star.type === "tough"
          ? "text-star-tough font-medium"
          : "text-star-soft font-medium"
        : "text-muted";
  const size =
    kind === "major"
      ? "text-[12px] sm:text-[15px]"
      : kind === "minor"
        ? "text-[11px] sm:text-[13px]"
        : "text-[11px] sm:text-[12px]";

  return (
    <span className={`flex-col items-center ${kind === "adjective" ? "hidden md:flex" : "flex"}`}>
      <span className={`vertical font-serif leading-none ${color} ${size}`}>{star.name}</span>
      {/* 亮度字在手機太密，只在較寬的畫面顯示；點宮位的詳情仍看得到 */}
      {star.brightness && (
        <span className="mt-0.5 hidden text-[10px] leading-none text-muted sm:block">{star.brightness}</span>
      )}
      {star.mutagen && (
        <span
          className={`mt-0.5 rounded-[3px] px-[2px] text-[10px] leading-[13px] font-bold sm:text-[10px] ${
            MUTAGEN_STYLE[star.mutagen] ?? ""
          }`}
        >
          {star.mutagen}
        </span>
      )}
      {flow && (
        <span
          className={`mt-0.5 rounded-[3px] border px-[1px] text-[10px] leading-[11px] font-bold sm:text-[10px] ${MUTAGEN_OUTLINE[flow]}`}
        >
          {flow}
        </span>
      )}
    </span>
  );
}

function CenterPanel({ astrolabe, input }: { astrolabe: Astrolabe; input: BirthInput }) {
  const pillars = astrolabe.chineseDate.split(" ");
  const birthMutagens = astrolabe.palaces.flatMap((p) =>
    [...p.majorStars, ...p.minorStars]
      .filter((s) => s.scope === "origin" && s.mutagen)
      .map((s) => ({ star: s.name, mutagen: s.mutagen as string })),
  );
  const order = ["祿", "權", "科", "忌"];
  birthMutagens.sort((a, b) => order.indexOf(a.mutagen) - order.indexOf(b.mutagen));

  return (
    <div
      style={{ gridRow: "2 / span 2", gridColumn: "2 / span 2" }}
      className="relative flex flex-col items-center justify-center gap-2 bg-surface px-2 py-3 text-center sm:gap-3 sm:px-6"
    >
      <div>
        <div className="font-serif text-base font-bold tracking-[0.15em] sm:text-2xl">
          {input.name || "命盤"}
        </div>
        <div className="mt-0.5 text-[11px] text-ink-soft sm:text-sm">
          {astrolabe.gender === "男" ? "乾造" : "坤造"}・{astrolabe.fiveElementsClass}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5 sm:gap-3" aria-label={`四柱 ${astrolabe.chineseDate}`}>
        {["年", "月", "日", "時"].map((label, i) => (
          <div key={label} className="flex flex-col items-center">
            <span className="text-[10px] text-muted sm:text-[11px]">{label}</span>
            <span className="vertical font-serif text-[13px] font-bold sm:text-lg">{pillars[i]}</span>
          </div>
        ))}
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-ink-soft sm:text-[13px]">
        <dt className="text-right text-muted">命主</dt>
        <dd className="text-left font-serif font-bold">{astrolabe.soul}</dd>
        <dt className="text-right text-muted">身主</dt>
        <dd className="text-left font-serif font-bold">{astrolabe.body}</dd>
      </dl>

      <dl className="hidden space-y-0.5 text-[12px] text-ink-soft sm:block">
        <div>
          <dt className="inline text-muted">國曆 </dt>
          <dd className="inline tabular-nums">{astrolabe.solarDate}</dd>
        </div>
        <div>
          <dt className="inline text-muted">農曆 </dt>
          <dd className="inline">
            {toTraditionalLunar(astrolabe.lunarDate)} {astrolabe.time}
          </dd>
        </div>
        <div>
          <dt className="inline text-muted">生肖 </dt>
          <dd className="inline">
            {astrolabe.zodiac}・{astrolabe.sign}
          </dd>
        </div>
      </dl>

      <div className="hidden flex-wrap justify-center gap-1.5 sm:flex" aria-label="生年四化">
        {birthMutagens.map((m) => (
          <span key={m.star} className="inline-flex items-center gap-1 text-[12px] text-ink-soft">
            <span className="font-serif">{m.star}</span>
            <span className={`rounded-[3px] px-1 text-[10px] leading-4 font-bold ${MUTAGEN_STYLE[m.mutagen]}`}>
              {m.mutagen}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * 三方四正連線。以格線為座標（0–4），每個宮位取「最靠近中宮的邊上一點」當端點，
 * 讓線條只畫在中宮範圍內，不壓到宮位內的星曜。
 */
function SurroundLines({ selectedIndex }: { selectedIndex: number }) {
  const rel = surroundedIndexes(selectedIndex);
  const anchor = (index: number) => {
    const { row, col } = GRID_POSITION[index];
    const clamp = (v: number) => Math.min(3, Math.max(1, v));
    return { x: clamp(col + 0.5), y: clamp(row + 0.5) };
  };
  const t = anchor(rel.target);
  const a = anchor(rel.trineA);
  const b = anchor(rel.trineB);
  const o = anchor(rel.opposite);

  return (
    <svg
      aria-hidden
      viewBox="0 0 4 4"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 size-full text-accent"
    >
      <polygon
        points={`${t.x},${t.y} ${a.x},${a.y} ${b.x},${b.y}`}
        fill="currentColor"
        fillOpacity="0.04"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.25"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={t.x}
        y1={t.y}
        x2={o.x}
        y2={o.y}
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.25"
        strokeDasharray="4 4"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
