import assert from "node:assert/strict";
import { chartFacts } from "../src/lib/chartFacts";
import { MUTAGENS, STEM_MUTAGENS } from "../src/lib/chartExtras";
import { horoscopeAt } from "../src/lib/periods";
import { computeAstrolabe, palaceTitle, type Astrolabe } from "../src/lib/ziwei";

async function main() {
  let seed = 20271119;
  const rand = (bound: number) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return Math.floor((seed / 2 ** 32) * bound);
  };
  let count = 0;
  const stars = (p: Astrolabe["palaces"][number]) => p.majorStars.concat(p.minorStars);
  for (let i = 0; i < 500; i++) {
    const year = 1900 + rand(201);
    const dateStr = `${year}-${1 + rand(12)}-${1 + rand(28)}`;
    const chart = await computeAstrolabe({ dateStr, timeIndex: rand(12) }, rand(2) ? "男" : "女");
    const h = horoscopeAt(chart, `${Math.min(year + rand(115), 2100)}-12-28`, 6);
    const expected: string[] = [];
    const add = (layer: string, text: string) => expected.push(`${layer}:${text}`);
    const name = (index: number) => palaceTitle(chart.palaces[index].name);
    const placeOf = (star: string) => chart.palaces.find((palace) => stars(palace).some((s) => s.name === star));
    for (const palace of chart.palaces) {
      const index = palace.index;
      const title = name(index);
      const opposite = (index + 6) % 12;
      add("本命", `${title}三方四正：${[index, opposite, (index + 4) % 12, (index + 8) % 12].map((pos) => `${name(pos)}有${stars(chart.palaces[pos]).concat(chart.palaces[pos].adjectiveStars).map((s) => s.name).join("、") || "無星曜"}`).join("；")}`);
      const majors = palace.majorStars.filter((s) => s.scope === "origin");
      if (majors.length) add("本命", `${title}有${majors.map((s) => s.name).join("、")}`);
      else {
        const borrowed = chart.palaces[opposite].majorStars.filter((s) => s.scope === "origin").map((s) => s.name).join("、");
        add("借星", `${title}無主星，借對宮${name(opposite)}的${borrowed || "主星（對宮亦空）"}`);
      }
      const flights = STEM_MUTAGENS[palace.heavenlyStem];
      for (const [i, star] of flights.entries()) {
        const target = placeOf(star);
        if (!target) continue;
        add("宮干飛化", `${title}飛${star}化${MUTAGENS[i]}入${name(target.index)}`);
        if (target.index === index) add("自化", `${title}${star}自化${MUTAGENS[i]}`);
      }
      for (const star of stars(palace)) {
        if (star.scope === "origin" && star.mutagen) add("生年", `${star.name}化${star.mutagen}入本命${title}`);
      }
    }
    if (h) {
      for (const [layer, period] of [[h.decadal.name === "童限" ? "童限" : "大限", h.decadal], ["流年", h.yearly], ["流月", h.monthly]] as const) {
        add(layer, `${layer}命宮在本命${name(period.index)}`);
        period.mutagen.forEach((star, index) => {
          const target = placeOf(star);
          if (target) add(layer, `${star}化${MUTAGENS[index]}入本命${name(target.index)}`);
        });
      }
    }
    const { facts } = chartFacts(chart, h);
    assert.deepEqual(facts.map(({ layer, text }) => `${layer}:${text}`).sort(), expected.sort(), dateStr);
    assert.deepEqual(facts.map(({ id }) => id), facts.map((_, i) => `F${i + 1}`));
    count += facts.length;
  }
  console.log(`✓ 500 張命盤，共 ${count} 條事實逐項符合`);
}

void main();
