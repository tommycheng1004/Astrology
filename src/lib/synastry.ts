import { MUTAGENS, STEM_MUTAGENS, palaceOfStar, type Mutagen } from "@/lib/chartExtras";
import { gradeOf, type Grade } from "@/lib/fortune";
import { zodiacOf } from "@/lib/taisui";
import { palaceTitle, surroundedIndexes, type Astrolabe } from "@/lib/ziwei";

/**
 * 合盤：兩張命盤互看。
 * 1. 四化互入：我的生年四化星，落在對方命盤的哪一宮（我帶給對方什麼）。
 * 2. 宮位呼應：我的夫妻宮（或子女、僕役宮）主星，是否正是對方命宮的主星。
 *    親子以出生日期判斷：年長的一方看子女宮，年幼的一方看父母宮。
 * 3. 生肖：六合、三合、沖、刑、害。
 * 4. 五行局：相生、相同或相剋。
 */

export type Relation = "couple" | "family" | "partner";

export const RELATIONS: { id: Relation; label: string; focus: string }[] = [
  { id: "couple", label: "情侶・夫妻", focus: "夫妻" },
  { id: "family", label: "親子", focus: "子女" },
  { id: "partner", label: "合夥・朋友", focus: "僕役" },
];

/** 各關係最看重的宮位與權重 */
const WEIGHTS: Record<Relation, Record<string, number>> = {
  couple: { 命宮: 1.5, 夫妻: 1.5, 福德: 1.2, 田宅: 0.8, 財帛: 0.8, 疾厄: 0.7 },
  family: { 命宮: 1.5, 子女: 1.4, 父母: 1.4, 福德: 1, 田宅: 0.8 },
  partner: { 命宮: 1.3, 財帛: 1.3, 官祿: 1.3, 僕役: 1.1, 兄弟: 1, 福德: 0.6 },
};

const MUTAGEN_SCORE: Record<Mutagen, number> = { 祿: 4, 權: 1.5, 科: 2.5, 忌: -4 };

/** {A} 為給出四化的一方，{B} 為接收的一方 */
const PALACE_MEANING: Record<string, { good: string; ji: string }> = {
  命宮: { good: "{B}覺得跟{A}在一起很舒服，{A}能帶給{B}好運與好感", ji: "{A}容易讓{B}有壓力，或{A}對{B}特別執著" },
  夫妻: { good: "{A}很符合{B}心目中伴侶的樣子", ji: "{A}對這段關係很在意，也容易讓{B}感到牽絆" },
  福德: { good: "{A}讓{B}心情愉快、精神上被滿足", ji: "{A}的言行容易影響{B}的心情" },
  財帛: { good: "{A}能為{B}帶來財運或實質幫助", ji: "兩人之間容易有金錢上的糾葛" },
  官祿: { good: "{A}對{B}的事業有幫助", ji: "{A}容易干涉{B}的工作，或在事業上產生摩擦" },
  田宅: { good: "{A}讓{B}有家的感覺，適合一起生活", ji: "同住或家務上容易有摩擦" },
  疾厄: { good: "{A}會照顧{B}的身體與生活起居", ji: "相處時容易讓{B}覺得累或有壓力" },
  子女: { good: "{A}和{B}的子女緣好，也能帶來創意與樂趣", ji: "在子女或晚輩的事上容易意見不合" },
  父母: { good: "{A}像長輩一樣照顧{B}，或得到{B}的尊重", ji: "{A}容易像長輩一樣對{B}管太多" },
  兄弟: { good: "{A}和{B}像手足一樣互相扶持", ji: "像手足一樣容易計較或爭執" },
  僕役: { good: "{A}是{B}信任的好朋友、好夥伴", ji: "朋友之間容易有誤會或利益衝突" },
  遷移: { good: "{A}能在外面幫{B}開拓機會", ji: "兩人在外的步調容易不一致" },
};

export type Crossing = {
  mutagen: Mutagen;
  star: string;
  palace: string;
  text: string;
  tone: "good" | "bad" | "neutral";
};

/** 甲方的生年四化落在乙方命盤的哪裡 */
function crossings(
  from: Astrolabe,
  to: Astrolabe,
  relation: Relation,
  nameFrom: string,
  nameTo: string,
): { list: Crossing[]; score: number } {
  const stem = from.rawDates.chineseDate.yearly[0];
  const list: Crossing[] = [];
  let score = 0;
  STEM_MUTAGENS[stem].forEach((star, i) => {
    const m = MUTAGENS[i];
    const palace = palaceOfStar(to, star);
    if (!palace) return;
    const meaning = PALACE_MEANING[palace.name];
    const weight = WEIGHTS[relation][palace.name] ?? 0.3;
    score += MUTAGEN_SCORE[m] * weight;
    const where = palaceTitle(palace.name);
    const template =
      m === "忌"
        ? meaning?.ji ?? `{A}在{B}的${where}帶來牽絆，需要多體諒`
        : m === "權"
          ? `{A}在{B}的${where}有影響力，{B}會聽{A}的意見`
          : m === "科"
            ? `{A}在{B}的${where}帶來理性與好名聲，溝通順暢`
            : meaning?.good ?? `{A}在{B}的${where}帶來助益`;
    const text = template.replaceAll("{A}", nameFrom).replaceAll("{B}", nameTo);
    list.push({ mutagen: m, star, palace: palaceTitle(palace.name), text, tone: m === "忌" ? "bad" : m === "權" ? "neutral" : "good" });
  });
  return { list, score };
}

/* 生肖 */
const BR = "子丑寅卯辰巳午未申酉戌亥";
const LIUHE = ["子丑", "寅亥", "卯戌", "辰酉", "巳申", "午未"];
const SANHE = ["申子辰", "亥卯未", "寅午戌", "巳酉丑"];
const HAI = ["子未", "丑午", "寅巳", "卯辰", "申亥", "酉戌"];

function zodiacMatch(a: string, b: string) {
  const pair = (list: string[]) => list.some((p) => p === a + b || p === b + a);
  const za = zodiacOf(a);
  const zb = zodiacOf(b);
  if (a === b) return { score: 2, text: `同樣屬${za}，想法相近，容易理解彼此。` };
  if (pair(LIUHE)) return { score: 6, text: `屬${za}與屬${zb}是六合，天生合拍，相處融洽。` };
  if (SANHE.some((g) => g.includes(a) && g.includes(b))) return { score: 5, text: `屬${za}與屬${zb}是三合，目標一致，能互相成就。` };
  if ((BR.indexOf(a) + 6) % 12 === BR.indexOf(b)) return { score: -5, text: `屬${za}與屬${zb}相沖，個性差異大，需要更多包容。` };
  if (pair(HAI)) return { score: -3, text: `屬${za}與屬${zb}相害，容易有誤會，溝通要直接一點。` };
  return { score: 0, text: `屬${za}與屬${zb}沒有特別的合沖，相處看彼此經營。` };
}

/* 五行局 */
const ELEMENT: Record<string, string> = { 水二局: "水", 木三局: "木", 金四局: "金", 土五局: "土", 火六局: "火" };
const SHENG: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
const KE: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };

function elementMatch(a: Astrolabe, b: Astrolabe, nameA: string, nameB: string) {
  const ea = ELEMENT[a.fiveElementsClass];
  const eb = ELEMENT[b.fiveElementsClass];
  const head = `${nameA}是${a.fiveElementsClass}、${nameB}是${b.fiveElementsClass}`;
  if (!ea || !eb) return { score: 0, text: head };
  if (ea === eb) return { score: 2, text: `${head}，同屬${ea}，步調相近。` };
  if (SHENG[ea] === eb) return { score: 3, text: `${head}，${ea}生${eb}，${nameA}比較會照顧、成全${nameB}。` };
  if (SHENG[eb] === ea) return { score: 3, text: `${head}，${eb}生${ea}，${nameB}比較會照顧、成全${nameA}。` };
  if (KE[ea] === eb) return { score: -3, text: `${head}，${ea}剋${eb}，${nameA}容易在不自覺中給${nameB}壓力。` };
  return { score: -3, text: `${head}，${eb}剋${ea}，${nameB}容易在不自覺中給${nameA}壓力。` };
}

const ROLE: Record<string, string> = { 夫妻: "伴侶", 子女: "孩子", 父母: "父母", 僕役: "夥伴" };

/** 出生先後，用來判斷親子關係中誰是父母 */
function birthOrder(astro: Astrolabe) {
  const [y, m, d] = astro.solarDate.split("-").map(Number);
  return Date.UTC(y, m - 1, d) + BR.indexOf(astro.rawDates.chineseDate.hourly[1]);
}

/* 宮位呼應：我的夫妻（子女、父母、僕役）宮主星，是否就是對方命宮的主星 */
function echo(a: Astrolabe, b: Astrolabe, focus: string, nameA: string, nameB: string) {
  const majorsOf = (astro: Astrolabe, name: string) => {
    const p = astro.palaces.find((x) => x.name === name)!;
    const src = p.majorStars.length ? p : astro.palaces[surroundedIndexes(p.index).opposite];
    return src.majorStars.map((s) => s.name);
  };
  const aFocus = majorsOf(a, focus);
  const bSoul = majorsOf(b, "命宮");
  const shared = aFocus.filter((s) => bSoul.includes(s));
  if (shared.length)
    return {
      score: 6,
      text: `${nameA}的${palaceTitle(focus)}是${aFocus.join("、")}，${nameB}的命宮正好有${shared.join("、")}：${nameB}就是${nameA}命中注定的那種${ROLE[focus]}類型。`,
    };
  return { score: 0, text: `${nameA}的${palaceTitle(focus)}是${aFocus.join("、")}，${nameB}的命宮是${bSoul.join("、")}，類型不同，需要時間磨合。` };
}

export type SynastryResult = {
  score: number;
  grade: Grade;
  headline: string;
  aToB: Crossing[];
  bToA: Crossing[];
  zodiac: string;
  element: string;
  echoes: string[];
};

export function analyzeSynastry(a: Astrolabe, b: Astrolabe, relation: Relation, nameA = "你", nameB = "對方"): SynastryResult {
  const ab = crossings(a, b, relation, nameA, nameB);
  const ba = crossings(b, a, relation, nameB, nameA);
  const zodiac = zodiacMatch(a.rawDates.chineseDate.yearly[1], b.rawDates.chineseDate.yearly[1]);
  const element = elementMatch(a, b, nameA, nameB);
  const focus = RELATIONS.find((r) => r.id === relation)!.focus;
  const aIsParent = birthOrder(a) <= birthOrder(b);
  const [focusA, focusB] = relation === "family" ? (aIsParent ? ["子女", "父母"] : ["父母", "子女"]) : [focus, focus];
  const echoAB = echo(a, b, focusA, nameA, nameB);
  const echoBA = echo(b, a, focusB, nameB, nameA);
  const raw = ab.score + ba.score + zodiac.score + element.score + echoAB.score + echoBA.score;
  const score = Math.round(Math.min(98, Math.max(10, 40 + raw * 1.8)));
  const grade = gradeOf(score);
  const headline =
    score >= 80
      ? "非常契合，彼此能帶給對方很多正面的力量。"
      : score >= 65
        ? "整體契合，相處順利，小摩擦也容易化解。"
        : score >= 45
          ? "有合有不合，用心經營就能走得長久。"
          : score >= 30
            ? "差異比較大，需要更多的溝通與包容。"
            : "考驗較多，彼此要多給空間、放慢腳步。";
  return {
    score,
    grade,
    headline,
    aToB: ab.list,
    bToA: ba.list,
    zodiac: zodiac.text,
    element: element.text,
    echoes: [echoAB.text, echoBA.text],
  };
}
