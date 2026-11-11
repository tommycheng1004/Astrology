import type { IFunctionalPalace } from "iztro/lib/astro/FunctionalPalace";
import { palaceTitle, surroundedIndexes, type Astrolabe } from "@/lib/ziwei";

/**
 * 盤面進階資訊：宮干四化（飛星）、自化、夾宮、來因宮。
 * iztro 的 mutagedPlaces() 在繁體模式下比對不到星名，所以飛星自行計算；
 * 四化表為通行版，與排盤設定一致（已由 scripts/verify-chart.ts 驗算）。
 */

export type Mutagen = "祿" | "權" | "科" | "忌";
export const MUTAGENS: Mutagen[] = ["祿", "權", "科", "忌"];

export const STEM_MUTAGENS: Record<string, [string, string, string, string]> = {
  甲: ["廉貞", "破軍", "武曲", "太陽"],
  乙: ["天機", "天梁", "紫微", "太陰"],
  丙: ["天同", "天機", "文昌", "廉貞"],
  丁: ["太陰", "天同", "天機", "巨門"],
  戊: ["貪狼", "太陰", "右弼", "天機"],
  己: ["武曲", "貪狼", "天梁", "文曲"],
  庚: ["太陽", "武曲", "太陰", "天同"],
  辛: ["巨門", "太陽", "文曲", "文昌"],
  壬: ["天梁", "紫微", "左輔", "武曲"],
  癸: ["破軍", "巨門", "太陰", "貪狼"],
};

export function starsOf(palace: IFunctionalPalace) {
  return [...palace.majorStars, ...palace.minorStars];
}

export function palaceOfStar(astrolabe: Astrolabe, star: string) {
  return astrolabe.palaces.find((p) => starsOf(p).some((s) => s.name === star)) ?? null;
}

export type Flight = {
  mutagen: Mutagen;
  star: string;
  to: IFunctionalPalace | null;
  /** 飛回本宮 */
  self: boolean;
  /** 飛入對宮（化忌入對宮即「忌沖」本宮） */
  opposite: boolean;
};

/** 某宮的宮干四化飛到哪裡 */
export function flightsOf(astrolabe: Astrolabe, index: number): Flight[] {
  const palace = astrolabe.palaces[index];
  const opposite = surroundedIndexes(index).opposite;
  return STEM_MUTAGENS[palace.heavenlyStem].map((star, i) => {
    const to = palaceOfStar(astrolabe, star);
    return { mutagen: MUTAGENS[i], star, to, self: to?.index === index, opposite: to?.index === opposite };
  });
}

/** 某宮的自化（宮干化出的星就在本宮） */
export function selfMutagensOf(astrolabe: Astrolabe, index: number) {
  return flightsOf(astrolabe, index).filter((f) => f.self);
}

export type Flank = { label: string; tone: "good" | "bad" | "neutral"; note: string };

const FLANK_PAIRS: { stars: [string, string]; label: string; tone: Flank["tone"]; note: string }[] = [
  { stars: ["左輔", "右弼"], label: "左右夾", tone: "good", note: "左右兩宮有左輔、右弼，容易得到旁人幫忙" },
  { stars: ["文昌", "文曲"], label: "昌曲夾", tone: "good", note: "文昌、文曲相夾，利文書、考試與名聲" },
  { stars: ["天魁", "天鉞"], label: "魁鉞夾", tone: "good", note: "天魁、天鉞相夾，貴人運強" },
  { stars: ["太陽", "太陰"], label: "日月夾", tone: "good", note: "太陽、太陰相夾，光明有助力" },
  { stars: ["擎羊", "陀羅"], label: "羊陀夾", tone: "bad", note: "擎羊、陀羅相夾，容易受到牽制或壓力" },
  { stars: ["火星", "鈴星"], label: "火鈴夾", tone: "bad", note: "火星、鈴星相夾，容易有突發的衝擊" },
  { stars: ["地空", "地劫"], label: "空劫夾", tone: "bad", note: "地空、地劫相夾，容易有落空或損耗" },
];

/** 夾宮：左右兩宮的星曜組合 */
export function flanksOf(astrolabe: Astrolabe, index: number): Flank[] {
  const prev = astrolabe.palaces[(index + 11) % 12];
  const next = astrolabe.palaces[(index + 1) % 12];
  const has = (p: IFunctionalPalace, star: string) => starsOf(p).some((s) => s.name === star);
  const result: Flank[] = [];
  for (const pair of FLANK_PAIRS) {
    const [a, b] = pair.stars;
    if ((has(prev, a) && has(next, b)) || (has(prev, b) && has(next, a)))
      result.push({ label: pair.label, tone: pair.tone, note: pair.note });
  }
  const lu = (p: IFunctionalPalace) => has(p, "祿存") || starsOf(p).some((s) => s.mutagen === "祿");
  if (lu(prev) && lu(next)) result.push({ label: "雙祿夾", tone: "good", note: "兩側都有祿，財源與資源充足" });
  const palace = astrolabe.palaces[index];
  if (result.some((f) => f.label === "羊陀夾") && starsOf(palace).some((s) => s.mutagen === "忌"))
    result.push({ label: "羊陀夾忌", tone: "bad", note: "化忌被擎羊、陀羅所夾，是較重的凶象，凡事要多留退路" });
  return result;
}

/** 來因宮：宮干與生年天干相同的宮位 */
export function originPalace(astrolabe: Astrolabe) {
  return astrolabe.palaces.find((p) => p.isOriginalPalace) ?? null;
}

export function flightText(f: Flight) {
  const target = f.to ? palaceTitle(f.to.name) : "（盤上無此星）";
  return `${f.star}化${f.mutagen}→${target}`;
}
