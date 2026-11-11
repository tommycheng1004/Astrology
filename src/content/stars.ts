import { STARS_INFO } from "iztro/lib/data/stars";
import { PERSONAS } from "@/lib/personality";

/** 十四主星的靜態介紹頁資料。性格與各宮解讀沿用排盤報告的同一份文字，頁面與排盤結果說法一致 */
export type StarMeta = {
  slug: string;
  name: string;
  /** 安星時所屬的星系 */
  family: "紫微星系" | "天府星系";
  element: string;
  /** 化氣 */
  essence: string;
  /** 一句話定位，用於列表與摘要 */
  tagline: string;
  infoKey: keyof typeof STARS_INFO;
};

export const STARS: StarMeta[] = [
  { slug: "ziwei", name: "紫微", family: "紫微星系", element: "陰土", essence: "尊", tagline: "帝星，主尊貴與領導", infoKey: "ziweiMaj" },
  { slug: "tianji", name: "天機", family: "紫微星系", element: "陰木", essence: "善", tagline: "智慧星，主謀略與變動", infoKey: "tianjiMaj" },
  { slug: "taiyang", name: "太陽", family: "紫微星系", element: "陽火", essence: "貴", tagline: "官祿主，主名聲與付出", infoKey: "taiyangMaj" },
  { slug: "wuqu", name: "武曲", family: "紫微星系", element: "陰金", essence: "財", tagline: "正財星，主財富與決斷", infoKey: "wuquMaj" },
  { slug: "tiantong", name: "天同", family: "紫微星系", element: "陽水", essence: "福", tagline: "福星，主享受與人緣", infoKey: "tiantongMaj" },
  { slug: "lianzhen", name: "廉貞", family: "紫微星系", element: "陰火", essence: "囚", tagline: "次桃花，主手腕與企圖心", infoKey: "lianzhenMaj" },
  { slug: "tianfu", name: "天府", family: "天府星系", element: "陽土", essence: "令", tagline: "財庫星，主穩重與守成", infoKey: "tianfuMaj" },
  { slug: "taiyin", name: "太陰", family: "天府星系", element: "陰水", essence: "富", tagline: "田宅主，主財富與細膩", infoKey: "taiyinMaj" },
  { slug: "tanlang", name: "貪狼", family: "天府星系", element: "陽木（體屬水）", essence: "桃花", tagline: "正桃花，主慾望與才藝", infoKey: "tanlangMaj" },
  { slug: "jumen", name: "巨門", family: "天府星系", element: "陰水（一說陰土）", essence: "暗", tagline: "是非星，主口才與研究", infoKey: "jumenMaj" },
  { slug: "tianxiang", name: "天相", family: "天府星系", element: "陽水", essence: "印", tagline: "印星，主協調與輔佐", infoKey: "tianxiangMaj" },
  { slug: "tianliang", name: "天梁", family: "天府星系", element: "陽土", essence: "蔭", tagline: "蔭星，主庇蔭與化解", infoKey: "tianliangMaj" },
  { slug: "qisha", name: "七殺", family: "天府星系", element: "陰金（一說屬火）", essence: "將", tagline: "將星，主開創與衝勁", infoKey: "qishaMaj" },
  { slug: "pojun", name: "破軍", family: "天府星系", element: "陰水", essence: "耗", tagline: "耗星，主破舊立新", infoKey: "pojunMaj" },
];

export const starBySlug = (slug: string) => STARS.find((s) => s.slug === slug);
export const starByName = (name: string) => STARS.find((s) => s.name === name);

/** iztro 亮度表的地支順序（由寅起） */
const BRANCH_ORDER = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];
const BRIGHTNESS_TEXT: Record<string, string> = { miao: "廟", wang: "旺", de: "得", li: "利", ping: "平", bu: "不", xian: "陷" };

/** 主星在十二地支的廟旺利陷，依子丑寅卯…排列 */
export function brightnessOf(star: StarMeta) {
  const table = STARS_INFO[star.infoKey].brightness as readonly string[];
  const rows = BRANCH_ORDER.map((branch, i) => ({ branch, level: BRIGHTNESS_TEXT[table[i]] ?? "—" }));
  return [...rows.slice(10), ...rows.slice(0, 10)];
}

/** 含這顆星的雙星同宮組合 */
export function combosOf(star: StarMeta) {
  return Object.entries(PERSONAS)
    .filter(([key]) => key.length === 4 && key.includes(star.name))
    .map(([key, persona]) => ({ key, pair: `${key.slice(0, 2)}・${key.slice(2)}`, ...persona }));
}
