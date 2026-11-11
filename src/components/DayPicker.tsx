"use client";

import { useId, useMemo, useState } from "react";
import FortuneList, { GRADE_BADGE } from "@/components/FortuneList";
import { resolveBirth } from "@/lib/birthtime";
import { PURPOSE_GROUPS, PURPOSES, pickDays, type DayPick } from "@/lib/dateSelect";
import { solarStringToLunar } from "@/lib/lunar";
import { yearGanzhi } from "@/lib/periods";
import { chartCaption, type SavedChart } from "@/lib/savedCharts";
import { ZODIAC } from "@/lib/taisui";
import type { Astrolabe } from "@/lib/ziwei";

const SPANS = [30, 60, 90];
const BRANCHES = "子丑寅卯辰巳午未申酉戌亥";

type Props = {
  astrolabe: Astrolabe;
  onSelectPalace: (index: number) => void;
  /** 「我的命盤」清單，結婚擇日可以直接選另一半 */
  savedCharts?: SavedChart[];
  /** 目前這張命盤在清單裡的 id，選另一半時排除 */
  selfId?: string;
};

/** 另一半的生年地支（紫微與生肖都以正月初一換年）。晚子時等校正與排盤一致 */
function birthBranchOf(chart: SavedChart) {
  try {
    const resolved = resolveBirth(chart.saved.input, chart.saved);
    return yearGanzhi(solarStringToLunar(resolved.dateStr).lunarYear)[1];
  } catch {
    return null;
  }
}

export default function DayPicker({ astrolabe, onSelectPalace, savedCharts = [], selfId }: Props) {
  const id = useId();
  const [purpose, setPurpose] = useState(PURPOSES[0].id);
  const [span, setSpan] = useState(30);
  const [open, setOpen] = useState<string | null>(null);
  /** 另一半："" 不考慮、"chart:<id>" 我的命盤、"zodiac:<地支>" 直接選生肖 */
  const [partner, setPartner] = useState("");
  const chosen = PURPOSES.find((p) => p.id === purpose) ?? PURPOSES[0];
  const others = savedCharts.filter((c) => c.id !== selfId);

  const partnerBranch = useMemo(() => {
    if (!chosen.couple || !partner) return undefined;
    if (partner.startsWith("zodiac:")) return partner.slice(7);
    const chart = others.find((c) => `chart:${c.id}` === partner);
    return (chart && birthBranchOf(chart)) ?? undefined;
  }, [chosen.couple, partner, others]);

  const result = useMemo(() => pickDays(astrolabe, purpose, span, new Date(), partnerBranch), [astrolabe, purpose, span, partnerBranch]);
  const excludedText = result.excluded.map((x) => `${x.label} ${x.count} 天`).join("、");

  return (
    <div className="space-y-5">
      <section aria-labelledby="pick-title" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h3 id="pick-title" className="font-serif text-2xl font-bold">
          紫微擇日
        </h3>
        <p className="mt-1 max-w-[40em] text-[15px] text-ink-soft">
          依你的命盤與每天的流日，挑出最適合做這件事的日子，並附上當天最好的時辰；農民曆的沖煞與歲破、月破也一併避開。
        </p>

        <fieldset className="mt-5">
          <legend className="mb-1 text-sm font-medium text-ink-soft">要做什麼事？</legend>
          <div className="space-y-4">
            {PURPOSE_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="mb-2 font-serif text-sm font-bold tracking-wide text-gold">{group.title}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {group.items.map((p) => (
                    <label
                      key={p.id}
                      className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-line bg-paper/40 px-2 py-2 text-center text-[15px] leading-snug text-ink-soft transition has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:font-bold has-[:checked]:text-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
                    >
                      <input
                        type="radio"
                        name="purpose"
                        value={p.id}
                        checked={purpose === p.id}
                        onChange={() => {
                          setPurpose(p.id);
                          setOpen(null);
                        }}
                        className="sr-only"
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </fieldset>
        <p role="status" className="mt-3 rounded-lg bg-surface-2/60 px-3.5 py-2.5 text-sm leading-relaxed text-ink-soft">
          <span className="font-medium text-ink">{chosen.label}</span>：{chosen.note}
          {chosen.avoidGhostMonth && "依台灣習俗避開農曆七月。"}
        </p>

        {chosen.couple && (
          <div className="mt-4">
            <label htmlFor={`${id}-partner`} className="mb-2 block text-sm font-medium text-ink-soft">
              另一半<span className="ml-2 text-xs font-normal text-muted">一起避開沖對方生肖的日子</span>
            </label>
            <div className="relative max-w-sm">
              <select
                id={`${id}-partner`}
                value={partner}
                onChange={(e) => setPartner(e.target.value)}
                className="h-11 w-full appearance-none rounded-lg border border-line bg-paper/60 px-3 pr-8 text-base text-ink focus:border-accent focus:bg-surface focus:outline-none"
              >
                <option value="">先不考慮</option>
                {others.length > 0 && (
                  <optgroup label="我的命盤">
                    {others.map((c) => (
                      <option key={c.id} value={`chart:${c.id}`}>
                        {c.saved.input.name || "未命名"}（{chartCaption(c.saved)}）
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="直接選對方的生肖">
                  {[...BRANCHES].map((b, i) => (
                    <option key={b} value={`zodiac:${b}`}>
                      屬{ZODIAC[i]}
                    </option>
                  ))}
                </optgroup>
              </select>
              <svg aria-hidden viewBox="0 0 16 16" className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted">
                <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
          </div>
        )}

        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-medium text-ink-soft">從今天起找多久？</legend>
          <div className="grid h-11 max-w-sm grid-cols-3 rounded-lg border border-line bg-paper/60 p-1">
            {SPANS.map((d) => (
              <label
                key={d}
                className="flex cursor-pointer items-center justify-center rounded-md text-[15px] text-ink-soft transition has-[:checked]:bg-surface has-[:checked]:font-bold has-[:checked]:text-accent has-[:checked]:shadow-sm"
              >
                <input type="radio" name="span" value={d} checked={span === d} onChange={() => setSpan(d)} className="sr-only" />
                {d} 天
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      {result.available > 0 && result.available < result.span && (
        <p className="text-sm text-muted">
          這 {result.span} 天中只有出生之後的 {result.available} 天可以推算，名單只從這幾天裡挑。
        </p>
      )}
      {result.available === 0 && (
        <p className="rounded-2xl border border-line bg-surface p-6 text-center text-ink-soft">
          這段期間都在出生日期之前，還沒有流日可以推算。
        </p>
      )}
      {result.blockedAll && (
        <p className="rounded-2xl border border-gold/40 bg-gold/10 p-5 text-[15px] leading-relaxed text-ink-soft">
          這 {result.span} 天每一天都遇到農民曆的避忌（{excludedText}），沒有可以推薦的日子。
          {span < 90 ? "請把範圍拉長到 60 或 90 天再看看。" : "可以等這段期間過了再安排。"}
        </p>
      )}
      <DayList
        title={`最適合「${result.purpose.label}」的日子`}
        days={result.best}
        open={open}
        onToggle={setOpen}
        tone="good"
        onSelectPalace={onSelectPalace}
      />
      <DayList title="盡量避開的日子" days={result.avoid} open={open} onToggle={setOpen} tone="bad" onSelectPalace={onSelectPalace} />

      <p className="text-xs leading-relaxed text-muted">
        依紫微流日、流時推算，再套用農民曆最基本的避忌：日沖生肖、歲破、月破
        {chosen.avoidGhostMonth ? "、農曆七月" : ""}
        {chosen.allowPo ? "（就醫類不避破日）" : ""}。
        {excludedText && `這段期間排除了${excludedText}。`}
        農民曆以立春換年、節氣換月，和紫微的正月初一換年不同。黃道吉日的完整宜忌請再對照農民曆。子時指前一天 23:00 到當天 00:59。重要的事仍以實際狀況為主，醫療事項以醫師安排為準。
      </p>
    </div>
  );
}

function DayList(props: Parameters<typeof DayListBody>[0]) {
  return props.days.length ? <DayListBody {...props} /> : null;
}

function DayListBody({
  title,
  days,
  open,
  onToggle,
  tone,
  onSelectPalace,
}: {
  title: string;
  days: DayPick[];
  open: string | null;
  onToggle: (date: string | null) => void;
  tone: "good" | "bad";
  onSelectPalace: (index: number) => void;
}) {
  return (
    <section>
      <h4 className="mb-3 font-serif text-xl font-bold">{title}</h4>
      <ul className="space-y-2">
        {days.map((d, i) => {
          const expanded = open === d.date;
          const shown = d.flags.filter((f) => f.blocks);
          return (
            <li key={d.date} className="overflow-hidden rounded-2xl border border-line bg-surface">
              <button
                type="button"
                onClick={() => onToggle(expanded ? null : d.date)}
                aria-expanded={expanded}
                className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-4 text-left transition hover:bg-surface-2/50"
              >
                <span
                  aria-hidden
                  className={`grid size-9 place-items-center rounded-full font-serif text-base font-bold ${
                    tone === "good" ? "bg-lu/15 text-lu" : "bg-ji/10 text-ji"
                  }`}
                >
                  {i + 1}
                </span>
                <span>
                  <span className="block font-serif text-lg font-bold tabular-nums">{d.label}</span>
                  <span className="block text-sm text-muted">
                    農曆{d.lunar}・{d.ganzhi}
                    {shown.map((f) => (
                      <span key={f.kind} className="ml-1.5 inline-block rounded bg-ji/10 px-1.5 font-medium text-ji">
                        {f.text}
                      </span>
                    ))}
                  </span>
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${GRADE_BADGE[d.grade]}`}>{d.grade}</span>
                {d.bestHours.length > 0 && (
                  <span className="col-span-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft sm:col-start-2">
                    <span className="text-muted">最佳時辰</span>
                    {d.bestHours.map((h) => (
                      <span key={h.hour} className="rounded-md bg-accent-soft px-2 py-0.5 font-serif font-medium text-accent">
                        {h.label}
                        <span className="ml-1 font-sans text-xs font-normal text-ink-soft tabular-nums">{h.range}</span>
                      </span>
                    ))}
                  </span>
                )}
                {d.reason && <span className="col-span-3 text-[15px] leading-relaxed text-ink-soft sm:col-start-2">{d.reason}</span>}
              </button>
              {expanded && (
                <div className="border-t border-line/60 bg-paper/40 p-4 sm:p-5">
                  <p className="mb-2 text-sm text-muted">這天和這件事有關的宮位</p>
                  <FortuneList results={d.results} onSelectPalace={onSelectPalace} palaceVerb="流日落在的" />
                  <p className="mt-4 mb-2 text-sm text-muted">這天的其他宮位</p>
                  <FortuneList results={d.others} onSelectPalace={onSelectPalace} palaceVerb="流日落在的" />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
