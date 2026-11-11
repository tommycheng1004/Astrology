import type { IFunctionalHoroscope } from "iztro/lib/astro/FunctionalHoroscope";
import { analyzeLayer, overallOf } from "@/lib/fortune";
import {
  HOURS,
  YEAR_SPAN,
  horoscopeAt,
  solarDateOf,
  yearGanzhi,
  yearSolarRange,
  yearEndDate,
  yearStartDate,
  type Level,
  type MonthEntry,
  type Selection,
} from "@/lib/periods";
import { taisuiOf } from "@/lib/taisui";
import { palaceTitle, type Astrolabe } from "@/lib/ziwei";

/** 時間軸上的一格：一個大限、流年、流月、流日或流時，overall 為五運平均 */
export type PeriodColumn = {
  key: number;
  title: string;
  /** 國曆日期或時間，格子裡第二行顯示 */
  solar: string;
  sub: string;
  overall: number | null;
  current: boolean;
  /** 額外標記，例如犯太歲 */
  tag?: string;
  /** 大限欄位涵蓋幾年（童限較短），預設 10 */
  span?: number;
};

function periodScore(astrolabe: Astrolabe, h: IFunctionalHoroscope | null, level: Level) {
  if (!h) return null;
  return overallOf(analyzeLayer(astrolabe, h, level)).score;
}

/** 時段的最後一刻：該日亥時 */
const endOf = (date: string | null) => (date ? { date, hour: 11 } : undefined);

/** 一生十二個大限，key 為該大限第一年的農曆年 */
/** 童限每年換宮，點選時要看哪一年：已選的年份在童限內就用它，否則今年，再否則出生那年 */
export function childhoodYear(birthYear: number, span: number, selYear: number, nowYear: number) {
  const inside = (y: number) => y >= birthYear && y < birthYear + span;
  return inside(selYear) ? selYear : inside(nowYear) ? nowYear : birthYear;
}

export function decadeColumns(astrolabe: Astrolabe, now: Selection, selYear = now.year): PeriodColumn[] {
  const birthYear = astrolabe.rawDates.lunarDate.lunarYear;
  const first = Math.min(...astrolabe.palaces.map((p) => p.decadal.range[0]));
  // 起運前是童限（虛歲 1 到五行局數減一）
  const childYear = childhoodYear(birthYear, first - 1, selYear, now.year);
  const childhood: PeriodColumn[] =
    first > 1
      ? [
          {
            key: birthYear,
            title: first === 2 ? "1歲" : `1–${first - 1}歲`,
            solar: first === 2 ? `${birthYear}` : `${birthYear}–${birthYear + first - 2}`,
            // 童限逐年換宮，分數只代表其中一年，標明是幾歲那年
            sub: `童限・${childYear - birthYear + 1}歲`,
            overall: periodScore(
              astrolabe,
              horoscopeAt(astrolabe, yearStartDate(childYear) ?? astrolabe.solarDate, 0, endOf(yearEndDate(childYear))),
              "decadal",
            ),
            current: now.year >= birthYear && now.year <= birthYear + first - 2,
            span: first - 1,
          },
        ]
      : [];
  return [...childhood, ...[...astrolabe.palaces]
    .sort((a, b) => a.decadal.range[0] - b.decadal.range[0])
    .map((p) => {
      const [from, to] = p.decadal.range;
      const start = birthYear + from - 1;
      const date = yearStartDate(start);
      return {
        key: start,
        title: `${from}–${to}歲`,
        solar: `${start}–${start + 9}`,
        sub: palaceTitle(p.name),
        overall: date ? periodScore(astrolabe, horoscopeAt(astrolabe, date, 0, endOf(yearEndDate(start + to - from))), "decadal") : null,
        current: now.year >= start && now.year <= start + 9,
      };
    })];
}

export function yearColumns(astrolabe: Astrolabe, from: number, now: Selection): PeriodColumn[] {
  const birthYear = astrolabe.rawDates.lunarDate.lunarYear;
  const birthBranch = astrolabe.rawDates.chineseDate.yearly[1];
  return Array.from({ length: YEAR_SPAN }, (_, i) => {
    const year = from + i;
    const date = yearStartDate(year);
    return {
      key: year,
      title: String(year),
      solar: `${yearSolarRange(year)?.fromShort ?? ""} 起`,
      sub: `${yearGanzhi(year)}・${year < birthYear ? "出生前" : `${year - birthYear + 1}歲`}`,
      overall: date ? periodScore(astrolabe, horoscopeAt(astrolabe, date, 0, endOf(yearEndDate(year))), "yearly") : null,
      current: year === now.year,
      tag: (() => {
        const kinds = taisuiOf(birthBranch, yearGanzhi(year)[1]);
        return kinds.length ? `${kinds.join("")}太歲` : undefined;
      })(),
    };
  });
}

export function monthColumns(astrolabe: Astrolabe, year: number, months: MonthEntry[], now: Selection): PeriodColumn[] {
  return months.map((m) => {
    const h = horoscopeAt(astrolabe, solarDateOf(year, m, m.dayRange[0]), 0, endOf(solarDateOf(year, m, m.dayRange[1])));
    return {
      key: m.key,
      title: m.label,
      solar: m.solarRange,
      sub: h ? `${h.monthly.heavenlyStem}${h.monthly.earthlyBranch}月` : "",
      overall: periodScore(astrolabe, h, "monthly"),
      current: year === now.year && m.key === now.monthKey,
    };
  });
}

export function dayColumns(
  astrolabe: Astrolabe,
  days: { day: number; label: string; solar: string; weekday: string; date: string }[],
  isCurrentMonth: boolean,
  now: Selection,
): PeriodColumn[] {
  return days.map((d) => ({
    key: d.day,
    title: d.label,
    solar: d.solar,
    sub: `週${d.weekday}`,
    overall: periodScore(astrolabe, horoscopeAt(astrolabe, d.date, 0, endOf(d.date)), "daily"),
    current: isCurrentMonth && d.day === now.day,
  }));
}

export function hourColumns(astrolabe: Astrolabe, date: string, isToday: boolean, now: Selection): PeriodColumn[] {
  return HOURS.map((hour) => ({
    key: hour.index,
    title: hour.label,
    solar: hour.range,
    sub: hour.index === 0 ? "前一天 23 點起" : "",
    overall: periodScore(astrolabe, horoscopeAt(astrolabe, date, hour.index), "hourly"),
    current: isToday && hour.index === now.hour,
  }));
}
