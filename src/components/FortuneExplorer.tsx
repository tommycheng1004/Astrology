"use client";

import { useMemo, useRef, useState } from "react";
import ChartBoard from "@/components/ChartBoard";
import FortuneList, { GRADE_BADGE, GRADE_BAR, headlineOf } from "@/components/FortuneList";
import PalaceDetail from "@/components/PalaceDetail";
import PalaceSheet, { isCompactViewport } from "@/components/PalaceSheet";
import { analyzeLayer, overallGradeOf, overallOf, type Grade } from "@/lib/fortune";
import {
  HOURS,
  LEVEL_NAME,
  MAX_AGE,
  YEAR_SPAN,
  daysOf,
  horoscopeAt,
  hourSolarText,
  yearEndDate,
  yearSolarRange,
  monthsOf,
  normalizeSelection,
  shiftDay,
  shiftMonth,
  yearGanzhi,
  type Level,
  type Selection,
} from "@/lib/periods";
import { taisuiOf, taisuiText, zodiacOf } from "@/lib/taisui";
import { childhoodYear, dayColumns, decadeColumns, hourColumns, monthColumns, yearColumns, type PeriodColumn } from "@/lib/trend";
import { palaceTitle, type Astrolabe, type BirthInput } from "@/lib/ziwei";

const SCALES: { level: Level; name: string; term: string; drill?: string; grid: string }[] = [
  { level: "decadal", name: "大運", term: "大限", drill: "看這十年每一年的運勢", grid: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6" },
  { level: "yearly", name: "年運", term: "流年", drill: "看這一年每個月的運勢", grid: "grid-cols-3 sm:grid-cols-5" },
  { level: "monthly", name: "月運", term: "流月", drill: "看這個月每一天的運勢", grid: "grid-cols-4 sm:grid-cols-6 lg:grid-cols-7" },
  { level: "daily", name: "日運", term: "流日", drill: "看這天每個時辰的運勢", grid: "grid-cols-5 sm:grid-cols-8 lg:grid-cols-10" },
  { level: "hourly", name: "時運", term: "流時", grid: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6" },
];

const GRADE_TEXT: Record<Grade, string> = {
  極佳: "text-lu",
  良好: "text-lu",
  平穩: "text-muted",
  稍弱: "text-quan",
  需留意: "text-ji",
};

type Props = {
  astrolabe: Astrolabe;
  input: BirthInput;
  now: Selection;
  /** 一開始要看的流年（例如從 2027 流年頁進來）；不在可推算範圍內就看今年 */
  initialYear?: number;
};

export default function FortuneExplorer({ astrolabe, input, now, initialYear }: Props) {
  const [scale, setScale] = useState<Level>("yearly");
  const [sel, setSel] = useState<Selection>(() => {
    const birth = astrolabe.rawDates.lunarDate.lunarYear;
    return initialYear && initialYear !== now.year && initialYear > birth && initialYear < birth + MAX_AGE
      ? normalizeSelection(astrolabe, { ...now, year: initialYear })
      : now;
  });
  const [yearFrom, setYearFrom] = useState(now.year);
  const [selectedIndex, setSelectedIndex] = useState(() => astrolabe.palaces.find((p) => p.name === "命宮")?.index ?? 0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const chartRef = useRef<HTMLDetailsElement>(null);

  const birthYear = astrolabe.rawDates.lunarDate.lunarYear;
  // 可翻閱的範圍：出生那年到虛歲 120 歲（iztro 小限只排到 120 歲）
  const maxYear = birthYear + MAX_AGE - 1;
  const months = useMemo(() => monthsOf(astrolabe, sel.year), [astrolabe, sel.year]);
  const entry = months[sel.monthKey];
  const days = useMemo(() => daysOf(sel.year, entry), [sel.year, entry]);
  const dayInfo = days.find((d) => d.day === sel.day) ?? days[0];
  const isCurrentMonth = sel.year === now.year && sel.monthKey === now.monthKey;
  const isToday = isCurrentMonth && sel.day === now.day;
  // 年運的十年視窗要包含目前選的年份
  const from = sel.year >= yearFrom && sel.year < yearFrom + YEAR_SPAN ? yearFrom : sel.year;

  // 較長的時段只要涵蓋出生時刻就算數（例如出生那一年的流年）；流時則要在出生之後
  const periodEnd =
    scale === "hourly"
      ? undefined
      : scale === "daily"
        ? dayInfo.date
        : scale === "monthly"
          ? days[days.length - 1].date
          : yearEndDate(sel.year);
  const horoscope = useMemo(
    () => horoscopeAt(astrolabe, dayInfo.date, sel.hour, periodEnd ? { date: periodEnd, hour: 11 } : undefined),
    [astrolabe, dayInfo.date, sel.hour, periodEnd],
  );
  const isCurrent = scale === "yearly" ? sel.year === now.year : scale === "daily" ? isToday : false;
  const results = useMemo(
    () => (horoscope ? analyzeLayer(astrolabe, horoscope, scale, isCurrent) : null),
    [astrolabe, horoscope, scale, isCurrent],
  );

  const columns = useMemo(() => {
    switch (scale) {
      case "decadal":
        return decadeColumns(astrolabe, now, sel.year);
      case "yearly":
        return yearColumns(astrolabe, from, now);
      case "monthly":
        return monthColumns(astrolabe, sel.year, months, now);
      case "daily":
        return dayColumns(astrolabe, days, isCurrentMonth, now);
      case "hourly":
        return hourColumns(astrolabe, dayInfo.date, isToday, now);
    }
  }, [scale, astrolabe, now, from, sel.year, months, days, isCurrentMonth, dayInfo.date, isToday]);

  const selectedKey =
    scale === "decadal"
      ? (columns.find((c) => sel.year >= c.key && sel.year < c.key + (c.span ?? 10))?.key ?? -1)
      : { yearly: sel.year, monthly: sel.monthKey, daily: sel.day, hourly: sel.hour }[scale];

  function pick(key: number) {
    if (scale === "decadal") {
      const span = columns.find((c) => c.key === key)?.span ?? 10;
      // 和卡片算分用同一年：已選的年份在這段內就不動，否則今年，再否則這段的第一年
      const year = childhoodYear(key, span, sel.year, now.year);
      setSel(normalizeSelection(astrolabe, { ...sel, year }, months));
      setYearFrom(key);
    }
    if (scale === "yearly") setSel(normalizeSelection(astrolabe, { ...sel, year: key }, months));
    if (scale === "monthly") setSel(normalizeSelection(astrolabe, { ...sel, monthKey: key }));
    if (scale === "daily") setSel({ ...sel, day: key });
    if (scale === "hourly") setSel({ ...sel, hour: key });
  }

  function shiftYear(delta: number) {
    setSel(normalizeSelection(astrolabe, { ...sel, year: sel.year + delta }, months));
  }

  const firstMonth = sel.monthKey === 0;
  const lastMonth = sel.monthKey === months.length - 1;
  const nav: { label: string; note: string; prev?: () => void; next?: () => void; canPrev: boolean; canNext: boolean } = {
    decadal: { label: "一生十二個大限，每個管十年", note: "", canPrev: false, canNext: false },
    yearly: {
      label: `${from}–${from + YEAR_SPAN - 1} 年`,
      note: "以農曆年計，從正月初一換年",
      prev: () => {
        setYearFrom(from - YEAR_SPAN);
        shiftYear(-YEAR_SPAN);
      },
      next: () => {
        setYearFrom(from + YEAR_SPAN);
        shiftYear(YEAR_SPAN);
      },
      canPrev: from > birthYear,
      canNext: from + YEAR_SPAN <= maxYear,
    },
    monthly: {
      label: `${sel.year} ${yearGanzhi(sel.year)}年`,
      note: solarSpan(yearSolarRange(sel.year)),
      prev: () => shiftYear(-1),
      next: () => shiftYear(1),
      canPrev: sel.year > birthYear,
      canNext: sel.year < maxYear,
    },
    daily: {
      label: `${sel.year} ${yearGanzhi(sel.year)}年・${entry.label}`,
      note: `國曆 ${entry.solarRangeFull}`,
      prev: () => setSel(shiftMonth(astrolabe, sel, -1)),
      next: () => setSel(shiftMonth(astrolabe, sel, 1)),
      canPrev: sel.year > birthYear || !firstMonth,
      canNext: sel.year < maxYear || !lastMonth,
    },
    hourly: {
      label: `${sel.year} 年${entry.label}${dayInfo.label}`,
      note: `國曆 ${dayInfo.solarFull}（週${dayInfo.weekday}）`,
      prev: () => setSel(shiftDay(astrolabe, sel, -1)),
      next: () => setSel(shiftDay(astrolabe, sel, 1)),
      canPrev: sel.year > birthYear || !firstMonth || sel.day > entry.dayRange[0],
      canNext: sel.year < maxYear || !lastMonth || sel.day < entry.dayRange[1],
    },
  }[scale];

  const scaleMeta = SCALES.find((s) => s.level === scale)!;
  const nextScale = SCALES[SCALES.indexOf(scaleMeta) + 1];
  const atNow = sel.year === now.year && sel.monthKey === now.monthKey && sel.day === now.day && sel.hour === now.hour;

  function heading() {
    if (!horoscope) return { title: "—", sub: "", solar: "" };
    const stem = (l: Level) => `${horoscope[l].heavenlyStem}${horoscope[l].earthlyBranch}`;
    switch (scale) {
      case "decadal": {
        const p = astrolabe.palaces[horoscope.decadal.index];
        if (horoscope.decadal.name === "童限") {
          // 童限每年換一宮，不能拿該宮本命的大限歲數當標題
          const first = Math.min(...astrolabe.palaces.map((x) => x.decadal.range[0]));
          return {
            title: first === 2 ? "童限 1 歲" : `童限 1–${first - 1} 歲`,
            sub: `${horoscope.age.nominalAge} 歲走${palaceTitle(p.name)}`,
            solar: solarSpan(yearSolarRange(birthYear, first - 1)),
          };
        }
        const start = birthYear + p.decadal.range[0] - 1;
        return {
          title: `大限 ${p.decadal.range[0]}–${p.decadal.range[1]} 歲`,
          sub: `走${palaceTitle(p.name)}`,
          solar: solarSpan(yearSolarRange(start, 10)),
        };
      }
      case "yearly":
        return {
          title: `${sel.year} ${yearGanzhi(sel.year)}年`,
          sub: `${horoscope.age.nominalAge} 歲・流年${stem("yearly")}`,
          solar: solarSpan(yearSolarRange(sel.year)),
        };
      case "monthly":
        return { title: `${sel.year} 年${entry.label}`, sub: `流月${stem("monthly")}`, solar: `國曆 ${entry.solarRangeFull}` };
      case "daily":
        return {
          title: `${entry.label}${dayInfo.label}`,
          sub: `流日${stem("daily")}`,
          solar: `國曆 ${dayInfo.solarFull}（週${dayInfo.weekday}）`,
        };
      case "hourly":
        return {
          title: `${entry.label}${dayInfo.label} ${HOURS[sel.hour].label}`,
          sub: `流時${stem("hourly")}`,
          solar: `國曆 ${hourSolarText(dayInfo.date, sel.hour)}`,
        };
    }
  }

  function selectPalace(index: number) {
    setSelectedIndex(index);
    if (isCompactViewport()) setSheetOpen(true);
  }

  function showPalace(index: number) {
    setSelectedIndex(index);
    if (chartRef.current) {
      chartRef.current.open = true;
      chartRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  const head = heading();
  const overall = results ? overallOf(results) : null;

  // 年運補充：犯太歲、全年重點月份、小限
  const yearExtras = useMemo(() => {
    if (scale !== "yearly" || !horoscope) return null;
    const birthBranch = astrolabe.rawDates.chineseDate.yearly[1];
    const kinds = taisuiOf(birthBranch, yearGanzhi(sel.year)[1]);
    const monthsScored = monthColumns(astrolabe, sel.year, months, now).filter((m) => m.overall !== null);
    const sorted = [...monthsScored].sort((a, b) => b.overall! - a.overall!);
    return {
      zodiac: zodiacOf(birthBranch),
      yearWord: sel.year === now.year ? "今年" : "這一年",
      taisui: kinds.length ? { label: `${kinds.join("")}太歲`, text: taisuiText(kinds) } : null,
      best: sorted.slice(0, 2),
      worst: sorted.length > 2 ? sorted.slice(-1) : [],
      smallLimit: palaceTitle(astrolabe.palaces[horoscope.age.index].name),
    };
  }, [scale, horoscope, astrolabe, sel.year, months, now]);

  function jumpToMonth(key: number) {
    setSel(normalizeSelection(astrolabe, { ...sel, monthKey: key }));
    setScale("monthly");
  }

  return (
    <div className="space-y-5">
      {/* 1. 時間尺度 */}
      <div
        role="tablist"
        aria-label="時間尺度"
        className="grid grid-cols-5 gap-1 rounded-2xl border border-line bg-surface p-1.5"
        onKeyDown={(e) => {
          // 左右鍵切換尺度（WAI-ARIA tabs）
          const i = SCALES.findIndex((s) => s.level === scale);
          const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? SCALES.length - 1 : null;
          if (next === null) return;
          e.preventDefault();
          const target = (next + SCALES.length) % SCALES.length;
          setScale(SCALES[target].level);
          e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[target]?.focus();
        }}
      >
        {SCALES.map((s) => {
          const active = s.level === scale;
          return (
            <button
              key={s.level}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => setScale(s.level)}
              className={`rounded-xl px-1 py-2 text-center transition ${
                active ? "bg-accent text-surface shadow-sm" : "text-ink-soft hover:bg-surface-2"
              }`}
            >
              <span className="block font-serif text-[15px] font-bold sm:text-base">{s.name}</span>
              <span className={`block text-xs ${active ? "text-surface/75" : "text-muted"}`}>{s.term}</span>
            </button>
          );
        })}
      </div>

      {/* 2. 選時段 */}
      <section aria-label="選擇時段" className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            {nav.prev && <StepButton dir="prev" onClick={nav.prev} disabled={!nav.canPrev} />}
            <div className="px-1">
              <p className="font-serif text-base font-bold">{nav.label}</p>
              {nav.note && <p className="text-xs text-muted">{nav.note}</p>}
            </div>
            {nav.next && <StepButton dir="next" onClick={nav.next} disabled={!nav.canNext} />}
          </div>
          {!atNow && (
            <button
              type="button"
              onClick={() => {
                setSel(now);
                setYearFrom(now.year);
              }}
              className="h-11 shrink-0 rounded-full border border-line px-4 text-sm text-ink-soft transition hover:border-accent hover:text-accent"
            >
              回到現在
            </button>
          )}
        </div>
        <div className={`mt-4 grid gap-2 ${scaleMeta.grid}`}>
          {columns.map((c) => (
            <PeriodChip key={c.key} column={c} selected={c.key === selectedKey} onPick={pick} />
          ))}
        </div>
      </section>

      {/* 3. 結論與五運 */}
      {results && overall ? (
        <section aria-labelledby="period-title" className="space-y-4">
          <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted">
                  {scaleMeta.name}・{head.sub}
                </p>
                <h3 id="period-title" className="mt-1 font-serif text-2xl font-bold sm:text-3xl">
                  {head.title}
                </h3>
                {head.solar && <p className="mt-1.5 text-[15px] text-ink-soft tabular-nums">{head.solar}</p>}
              </div>
              <span className={`rounded-full px-3 py-1 text-base font-bold ${GRADE_BADGE[overall.grade]}`}>
                整體{overall.grade}
              </span>
            </div>
            <p className="mt-4 max-w-[32em] text-lg leading-relaxed text-ink">{headlineOf(results, "period")}</p>
            {yearExtras && (
              <dl className="mt-4 grid gap-3 border-t border-line pt-4 text-[15px] sm:grid-cols-[6.5rem_1fr]">
                <dt className="text-sm text-muted">重點月份</dt>
                <dd className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-soft">
                  <span>最旺</span>
                  {yearExtras.best.map((m) => (
                    <MonthLink key={m.key} column={m} onClick={() => jumpToMonth(m.key)} tone="good" />
                  ))}
                  {yearExtras.worst.length > 0 && <span className="ml-1">要留意</span>}
                  {yearExtras.worst.map((m) => (
                    <MonthLink key={m.key} column={m} onClick={() => jumpToMonth(m.key)} tone="bad" />
                  ))}
                </dd>
                <dt className="text-sm text-muted">生肖太歲</dt>
                <dd className="text-ink-soft">
                  屬{yearExtras.zodiac}
                  {yearExtras.taisui ? (
                    <>
                      ，{yearExtras.yearWord}<strong className="font-bold text-ji">{yearExtras.taisui.label}</strong>：{yearExtras.taisui.text}
                      <span className="block text-xs text-muted">犯太歲為民俗說法，可作為提醒參考。</span>
                    </>
                  ) : (
                    `，${yearExtras.yearWord}沒有犯太歲。`
                  )}
                </dd>
                <dt className="text-sm text-muted">小限</dt>
                <dd className="text-ink-soft">走到本命{yearExtras.smallLimit}（另一套逐年運限，可與流年合參）</dd>
              </dl>
            )}
            {nextScale && scaleMeta.drill && (
              <button
                type="button"
                onClick={() => setScale(nextScale.level)}
                className="mt-3 inline-flex min-h-11 items-center text-[15px] font-medium text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
              >
                {scaleMeta.drill} →
              </button>
            )}
          </div>

          <FortuneList results={results} onSelectPalace={showPalace} palaceVerb={`${LEVEL_NAME[scale]}落在的`} />
        </section>
      ) : (
        <p className="rounded-2xl border border-line bg-surface p-6 text-center text-muted">
          {sel.year <= birthYear ? "這個時段在出生之前，沒有運勢可看。" : `這個時段超過 ${MAX_AGE} 歲，運限推算不到這麼遠。`}
        </p>
      )}

      {/* 4. 進階：疊盤 */}
      <details ref={chartRef} className="group scroll-mt-20 rounded-2xl border border-line bg-surface">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <span>
            <span className="font-serif text-base font-bold">在命盤上看{LEVEL_NAME[scale]}疊盤</span>
            <span className="mt-0.5 block text-sm text-muted">
              進階：每個宮位標出{LEVEL_NAME[scale]}宮名，星曜旁加框的是{LEVEL_NAME[scale]}四化
            </span>
          </span>
          <svg aria-hidden viewBox="0 0 16 16" className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180">
            <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </summary>
        <div className="grid gap-5 border-t border-line p-3 sm:p-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <ChartBoard
            astrolabe={astrolabe}
            input={input}
            selectedIndex={selectedIndex}
            horoscope={horoscope}
            lens={scale}
            onSelect={selectPalace}
          />
          <div className="hidden lg:block">
            <PalaceDetail
              astrolabe={astrolabe}
              selectedIndex={selectedIndex}
              horoscope={horoscope}
              lens={scale}
              onSelect={setSelectedIndex}
            />
          </div>
        </div>
      </details>

      <PalaceSheet open={sheetOpen} onClose={() => setSheetOpen(false)} label={`${palaceTitle(astrolabe.palaces[selectedIndex].name)}詳情`}>
        <PalaceDetail
          astrolabe={astrolabe}
          selectedIndex={selectedIndex}
          horoscope={horoscope}
          lens={scale}
          onSelect={setSelectedIndex}
          bare
        />
      </PalaceSheet>
    </div>
  );
}

function PeriodChip({ column, selected, onPick }: { column: PeriodColumn; selected: boolean; onPick: (key: number) => void }) {
  const grade = column.overall !== null ? overallGradeOf(column.overall) : null;
  return (
    <button
      type="button"
      disabled={!grade}
      onClick={() => onPick(column.key)}
      aria-pressed={selected}
      className={`relative flex flex-col items-center rounded-xl border px-1 pt-2 pb-1.5 text-center transition disabled:opacity-40 ${
        selected
          ? "border-accent bg-accent-soft shadow-[inset_0_0_0_1px_var(--accent)]"
          : "border-line bg-paper/40 hover:border-line-strong hover:bg-surface-2/60"
      }`}
    >
      {/* 名稱以畫面上的時段標題開頭，語音控制說「2027」就點得到 */}
      <span className="sr-only">
        {[column.title, column.current ? "現在" : null, `國曆${column.solar}`, column.sub, column.tag, grade ? `整體${grade}` : "出生前"]
          .filter(Boolean)
          .join("，")}
      </span>
      {column.current && (
        <span aria-hidden className="absolute -top-2.5 rounded-full bg-gold px-1.5 text-xs leading-5 font-bold text-surface">現在</span>
      )}
      <span aria-hidden className="font-serif text-sm font-bold whitespace-nowrap">{column.title}</span>
      <span aria-hidden className="text-xs whitespace-nowrap text-ink-soft tabular-nums">{column.solar}</span>
      {column.sub && <span aria-hidden className="text-xs whitespace-nowrap text-muted">{column.sub}</span>}
      {column.tag && <span aria-hidden className="mt-0.5 text-xs whitespace-nowrap text-ji">{column.tag}</span>}
      {grade && (
        <>
          <span aria-hidden className={`mt-1.5 h-1 w-3/4 rounded-full ${GRADE_BAR[grade]}`} />
          <span aria-hidden className={`mt-0.5 text-xs font-medium ${GRADE_TEXT[grade]}`}>
            {grade}
          </span>
        </>
      )}
    </button>
  );
}

function MonthLink({ column, onClick, tone }: { column: PeriodColumn; onClick: () => void; tone: "good" | "bad" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 items-center gap-1 underline underline-offset-4 ${
        tone === "good" ? "text-lu decoration-lu/40" : "text-ji decoration-ji/40"
      }`}
    >
      <span className="font-serif font-bold">{column.title}</span>
      <span className="text-sm tabular-nums">（{column.solar}）</span>
    </button>
  );
}

function StepButton({ dir, onClick, disabled }: { dir: "prev" | "next"; onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "上一段" : "下一段"}
      className="grid size-11 shrink-0 place-items-center rounded-full text-ink-soft transition hover:bg-surface-2 hover:text-accent disabled:pointer-events-none disabled:opacity-30"
    >
      <svg aria-hidden viewBox="0 0 16 16" className="size-4">
        <path d={dir === "prev" ? "M10 4l-4 4 4 4" : "M6 4l4 4-4 4"} fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    </button>
  );
}

function solarSpan(range: { from: string; to: string } | null) {
  return range ? `國曆 ${range.from} – ${range.to}` : "";
}
