import { flightsOf, MUTAGENS, palaceOfStar, selfMutagensOf, starsOf, type Mutagen } from "@/lib/chartExtras";
import type { horoscopeAt } from "@/lib/periods";
import { palaceTitle, surroundedIndexes, type Astrolabe } from "@/lib/ziwei";

export type Fact = { id: string; layer: string; text: string; palace: string };
export type Placement = { layer: string; palace: string; star: string; change?: Mutagen; from?: string };
export type CitedPlacement = Placement & { factId: string };
type Horoscope = NonNullable<ReturnType<typeof horoscopeAt>>;

export function chartFacts(astrolabe: Astrolabe, horoscope: Horoscope | null) {
  const facts: Fact[] = [];
  const placements: CitedPlacement[] = [];
  function add(layer: string, palace: string, text: string, positions: Placement[] = []) {
    const id = `F${facts.length + 1}`;
    facts.push({ id, layer, text, palace });
    for (const position of positions) placements.push({ ...position, factId: id });
  }
  const name = (index: number) => palaceTitle(astrolabe.palaces[index].name);
  const allStars = (index: number) => [...starsOf(astrolabe.palaces[index]), ...astrolabe.palaces[index].adjectiveStars];
  for (const palace of astrolabe.palaces) {
    const index = palace.index;
    const title = name(index);
    const { opposite, trineA, trineB } = surroundedIndexes(index);
    const group = [index, opposite, trineA, trineB];
    const positions = group.flatMap((i) => allStars(i).map((s) => ({ layer: "本命", palace: name(i), star: s.name })));
    const related = group.map((i) => `${name(i)}有${allStars(i).map((s) => s.name).join("、") || "無星曜"}`).join("；");
    add("本命", title, `${title}三方四正：${related}`, positions);
    const majors = palace.majorStars.filter((s) => s.scope === "origin");
    if (majors.length) {
      add("本命", title, `${title}有${majors.map((s) => s.name).join("、")}`, majors.map((s) => ({ layer: "本命", palace: title, star: s.name })));
    } else {
      const borrowed = astrolabe.palaces[opposite].majorStars.filter((s) => s.scope === "origin");
      add("借星", title, `${title}無主星，借對宮${name(opposite)}的${borrowed.map((star) => star.name).join("、") || "主星（對宮亦空）"}`,
        borrowed.map((s) => ({ layer: "借星", palace: title, star: s.name, from: name(opposite) })));
    }
    for (const flight of flightsOf(astrolabe, index)) {
      if (!flight.to) continue;
      const to = name(flight.to.index);
      add("宮干飛化", title, `${title}飛${flight.star}化${flight.mutagen}入${to}`,
        [{ layer: "宮干飛化", palace: to, star: flight.star, change: flight.mutagen, from: title }]);
    }
    for (const self of selfMutagensOf(astrolabe, index)) {
      add("自化", title, `${title}${self.star}自化${self.mutagen}`,
        [{ layer: "自化", palace: title, star: self.star, change: self.mutagen, from: title }]);
    }
    for (const star of starsOf(palace).filter((star) => star.scope === "origin" && star.mutagen)) {
      const change = star.mutagen as Mutagen;
      add("生年", title, `${star.name}化${change}入本命${title}`, [{ layer: "生年", palace: title, star: star.name, change }]);
    }
  }

  if (horoscope) {
    const layers = [
      [horoscope.decadal.name === "童限" ? "童限" : "大限", horoscope.decadal],
      ["流年", horoscope.yearly],
      ["流月", horoscope.monthly],
    ] as const;
    for (const [layer, period] of layers) {
      add(layer, name(period.index), `${layer}命宮在本命${name(period.index)}`);
      period.mutagen.forEach((star, i) => {
        const palace = palaceOfStar(astrolabe, star);
        if (!palace) return;
        const change = MUTAGENS[i];
        const title = name(palace.index);
        add(layer, title, `${star}化${change}入本命${title}`, [{ layer, palace: title, star, change }]);
      });
    }
  }
  return { facts, placements };
}
export const factText = (fact: Fact) => `${fact.id} [${fact.layer}] ${fact.text}`;
