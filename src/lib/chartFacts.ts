import { flightsOf, MUTAGENS, palaceOfStar, selfMutagensOf, starsOf, type Mutagen } from "@/lib/chartExtras";
import type { horoscopeAt } from "@/lib/periods";
import { palaceTitle, surroundedIndexes, type Astrolabe } from "@/lib/ziwei";

export type Fact = { id: string; layer: string; text: string };
export type Placement = { layer: string; palace: string; star: string; change?: Mutagen; from?: string };
type Horoscope = NonNullable<ReturnType<typeof horoscopeAt>>;

export function chartFacts(astrolabe: Astrolabe, horoscope: Horoscope | null) {
  const facts: Fact[] = [];
  const placements: Placement[] = [];
  const add = (layer: string, text: string) => facts.push({ id: `F${facts.length + 1}`, layer, text });
  const name = (index: number) => palaceTitle(astrolabe.palaces[index].name);
  const allStars = (index: number) => [...starsOf(astrolabe.palaces[index]), ...astrolabe.palaces[index].adjectiveStars];
  const list = (index: number) => allStars(index).map((star) => star.name).join("、") || "無星曜";
  for (const palace of astrolabe.palaces) {
    const index = palace.index;
    const title = name(index);
    const { opposite, trineA, trineB } = surroundedIndexes(index);
    for (const star of allStars(index)) placements.push({ layer: "本命", palace: title, star: star.name });
    add("本命", `${title}三方四正：${[index, opposite, trineA, trineB].map((i) => `${name(i)}有${list(i)}`).join("；")}`);
    if (!palace.majorStars.some((star) => star.scope === "origin")) {
      const borrowed = astrolabe.palaces[opposite].majorStars.filter((star) => star.scope === "origin");
      add("借星", `${title}無主星，借對宮${name(opposite)}的${borrowed.map((star) => star.name).join("、") || "主星（對宮亦空）"}`);
      for (const star of borrowed) placements.push({ layer: "借星", palace: title, star: star.name, from: name(opposite) });
    }
    for (const flight of flightsOf(astrolabe, index)) {
      if (!flight.to) continue;
      const to = name(flight.to.index);
      add("宮干飛化", `${title}飛${flight.star}化${flight.mutagen}入${to}`);
      placements.push({ layer: "宮干飛化", palace: to, star: flight.star, change: flight.mutagen, from: title });
    }
    for (const self of selfMutagensOf(astrolabe, index)) {
      add("自化", `${title}${self.star}自化${self.mutagen}`);
      placements.push({ layer: "自化", palace: title, star: self.star, change: self.mutagen, from: title });
    }
    for (const star of starsOf(palace).filter((star) => star.scope === "origin" && star.mutagen)) {
      const change = star.mutagen as Mutagen;
      add("生年", `${star.name}化${change}入本命${title}`);
      placements.push({ layer: "生年", palace: title, star: star.name, change });
    }
  }

  if (horoscope) {
    const layers = [
      ["大限", horoscope.decadal],
      ["流年", horoscope.yearly],
      ["流月", horoscope.monthly],
    ] as const;
    for (const [layer, period] of layers) {
      add(layer, `${layer}命宮在本命${name(period.index)}`);
      period.mutagen.forEach((star, i) => {
        const palace = palaceOfStar(astrolabe, star);
        if (!palace) return;
        const change = MUTAGENS[i];
        const title = name(palace.index);
        add(layer, `${star}化${change}入本命${title}`);
        placements.push({ layer, palace: title, star, change });
      });
    }
  }
  return { facts, placements };
}
export const factText = (fact: Fact) => `${fact.id} [${fact.layer}] ${fact.text}`;
