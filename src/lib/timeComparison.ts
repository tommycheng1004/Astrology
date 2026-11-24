import { MUTAGENS, starsOf } from "@/lib/chartExtras";
import { palaceTitle, surroundedIndexes, toTraditionalLunar, type Astrolabe } from "@/lib/ziwei";

/** 只取本命盤可直接讀出的欄位。用固定欄序，避免兩張盤按地支排列時對錯宮。 */
export type TimeComparisonFacts = Record<string, string>;

export function timeComparisonFacts(chart: Astrolabe): TimeComparisonFacts {
  const soul = chart.palaces.find((p) => p.name === "命宮")!;
  const body = chart.palaces.find((p) => p.isBodyPalace)!;
  const opposite = chart.palaces[surroundedIndexes(soul.index).opposite];
  const majors = (p: typeof soul) => p.majorStars.map((s) => s.name).join("、");
  const rows = {
    排盤國曆: chart.solarDate,
    排盤農曆: toTraditionalLunar(chart.lunarDate),
    命宮地支: soul.earthlyBranch,
    命宮主星: majors(soul) || `空宮，借${palaceTitle(opposite.name)}的${majors(opposite)}`,
    身宮落宮: palaceTitle(body.name),
    五行局: chart.fiveElementsClass,
  };
  const changes = new Map<string, string>();
  for (const palace of chart.palaces) {
    for (const star of starsOf(palace)) {
      if (star.mutagen && star.scope === "origin") changes.set(star.mutagen, `${star.name}入${palaceTitle(palace.name)}`);
    }
  }
  return {
    ...rows,
    ...Object.fromEntries(MUTAGENS.map((change) => [`生年化${change}`, changes.get(change) ?? "無資料"])),
  };
}
