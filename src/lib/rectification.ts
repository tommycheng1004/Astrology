import type { SavedBirth } from "@/components/BirthForm";
import { resolveBirth } from "@/lib/birthtime";
import { MUTAGENS, palaceOfStar } from "@/lib/chartExtras";
import { ALL_ASPECTS, analyzeLayer, type AspectKey } from "@/lib/fortune";
import { horoscopeAt, yearEndDate, yearStartDate } from "@/lib/periods";
import { computeAstrolabe, palaceTitle, TIME_SLOTS } from "@/lib/ziwei";

export const LIFE_EVENTS = {
  marriage: { label: "結婚", aspect: "love", difficult: false },
  job: { label: "換工作", aspect: "career", difficult: false },
  move: { label: "搬家", aspect: "home", difficult: false },
  surgery: { label: "開刀", aspect: "health", difficult: true },
  loss: { label: "親人過世", aspect: "elders", difficult: true },
  child: { label: "子女出生", aspect: "children", difficult: false },
  study: { label: "升學或考試", aspect: "elders", difficult: false },
  wealth: { label: "重大財務變動", aspect: "wealth", difficult: false },
} satisfies Record<string, { label: string; aspect: AspectKey; difficult: boolean }>;

export type LifeEvent = { year: number; kind: keyof typeof LIFE_EVENTS };

export function parseLifeEvents(value: unknown, earliest: number, latest: number): LifeEvent[] | null {
  if (!Array.isArray(value) || value.length < 5 || value.length > 10) return null;
  const events: LifeEvent[] = [];
  for (const item of value) {
    const { year, kind } = item ?? {};
    if (!Number.isInteger(year) || year < earliest || year > latest || typeof kind !== "string" || !Object.hasOwn(LIFE_EVENTS, kind)) return null;
    if (events.some((event) => event.year === year && event.kind === kind)) return null;
    events.push({ year, kind: kind as LifeEvent["kind"] });
  }
  return events;
}

export async function rankBirthTimes(saved: SavedBirth, events: LifeEvent[]) {
  const results = await Promise.all(TIME_SLOTS.map(async (slot) => {
    const input = { ...saved.input, timeIndex: slot.index };
    const chart = await computeAstrolabe(resolveBirth(input, { ...saved, timeMode: "slot" }), input.gender);
    const evidence = events.map(({ year, kind }) => {
      const event = LIFE_EVENTS[kind];
      const start = yearStartDate(year);
      const end = yearEndDate(year);
      const h = start ? horoscopeAt(chart, start, 0, end ? { date: end, hour: 11 } : undefined) : null;
      const label = `${year} 年 · ${event.label}`;
      if (!h) return { label, points: null, reasons: ["這一年超出這張命盤的可推算範圍。"] };

      const aspect = ALL_ASPECTS.find((a) => a.key === event.aspect)!;
      let impact = 0;
      const reasons = (["decadal", "yearly"] as const).map((layer) => {
        const scope = h[layer];
        const name = layer === "yearly" ? "流年" : h.decadal.name === "童限" ? "童限" : "大限";
        const reading = analyzeLayer(chart, h, layer, false, [aspect])[0];
        const change = scope.mutagen.flatMap((star, index) => {
          const target = palaceOfStar(chart, star);
          if (!target || scope.palaceNames[target.index] !== aspect.palace) return [];
          impact += index === 3 ? (event.difficult ? 6 : -6) : (event.difficult ? -2 : 3);
          return [`${star}化${MUTAGENS[index]}入本命${palaceTitle(target.name)}`];
        });
        const palaceIndex = scope.palaceNames.findIndex((name) => name === aspect.palace);
        const palace = palaceTitle(chart.palaces[palaceIndex].name);
        return { text: `${name}${palaceTitle(aspect.palace)}疊本命${palace}，參考指數 ${reading.score}。四化${change.length ? `為${change.join("、")}` : "未落此宮"}。`, score: reading.score };
      });
      const base = reasons[0].score * 0.4 + reasons[1].score * 0.6;
      const points = Math.max(0, Math.min(100, Math.round((event.difficult ? 100 - base : base) + impact)));
      return { label, points, reasons: reasons.map((reason) => reason.text) };
    });
    const points = evidence.flatMap((event) => event.points === null ? [] : [event.points]);
    return { ...slot, evidence, score: points.length ? Math.round(points.reduce((sum, point) => sum + point, 0) / points.length) : null };
  }));
  return results.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.index - b.index);
}

export type BirthRanking = Awaited<ReturnType<typeof rankBirthTimes>>;
