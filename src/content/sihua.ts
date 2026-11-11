/** 十干四化（通行版），與 iztro 的 default 演算法及 scripts/verify-chart.ts 一致 */
export const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
export const MUTAGENS = ["祿", "權", "科", "忌"] as const;
export type Mutagen = (typeof MUTAGENS)[number];

export const SIHUA: Record<(typeof STEMS)[number], [string, string, string, string]> = {
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

/** 某顆星在哪些天干會化祿權科忌 */
export function mutagensOfStar(star: string) {
  return STEMS.flatMap((stem) =>
    SIHUA[stem].flatMap((s, i) => (s === star ? [{ stem, mutagen: MUTAGENS[i] }] : [])),
  );
}

export const MUTAGEN_MEANING: Record<Mutagen, string> = {
  祿: "財祿、機會與順遂，代表得到",
  權: "權力、主導與積極，代表掌控",
  科: "名聲、貴人與條理，代表化解",
  忌: "執著、虧欠與課題，代表在意與阻礙",
};
