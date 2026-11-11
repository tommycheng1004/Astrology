import { starsOf } from "@/lib/chartExtras";
import { palaceTitle, surroundedIndexes, type Astrolabe } from "@/lib/ziwei";

/* ───────────── 桃花指數 ───────────── */

/** 桃花星與權重：正桃花（紅鸞天喜）、偏桃花（咸池天姚）、桃花主星（貪狼廉貞）、文桃花（昌曲） */
const PEACH: Record<string, number> = {
  紅鸞: 3,
  天喜: 2.5,
  咸池: 2.5,
  天姚: 2.5,
  貪狼: 3,
  廉貞: 2,
  文昌: 1,
  文曲: 1.5,
};
/** 桃花在哪個宮位影響最大 */
const PEACH_PLACE: Record<string, number> = { 命宮: 1.5, 夫妻: 1.4, 遷移: 1.1, 福德: 1, 子女: 0.9, 僕役: 0.8 };

export function peachBlossom(astrolabe: Astrolabe) {
  let raw = 0;
  const found: string[] = [];
  for (const p of astrolabe.palaces) {
    const factor = PEACH_PLACE[p.name] ?? 0;
    if (!factor) continue;
    const stars = [...starsOf(p), ...p.adjectiveStars].filter((s) => PEACH[s.name]);
    for (const s of stars) {
      raw += PEACH[s.name] * factor;
      if (s.mutagen === "祿") raw += 1.5 * factor;
      if (s.mutagen === "忌") raw -= 1.5 * factor;
    }
    if (p.changsheng12 === "沐浴") raw += 1 * factor;
    if (stars.length) found.push(`${palaceTitle(p.name)}有${stars.map((s) => s.name).join("、")}`);
  }
  const score = Math.round(Math.min(98, Math.max(5, raw * 5.5)));
  const level =
    score >= 75
      ? { label: "桃花旺", text: "異性緣很好，身邊不缺追求者；感情機會多，也要懂得分辨真心。" }
      : score >= 50
        ? { label: "桃花不錯", text: "人緣與異性緣都不錯，遇到合適的人時容易有好的發展。" }
        : score >= 30
          ? { label: "桃花平穩", text: "感情緣分平穩，多半是日久生情，適合從朋友慢慢發展。" }
          : { label: "桃花偏少", text: "桃花不算多，感情需要主動一點，多參加社交活動會有幫助。" };
  return { score, ...level, found };
}

/* ───────────── 財富類型 ───────────── */

const WEALTH_TYPES: { stars: string[]; name: string; text: string; advice: string }[] = [
  {
    stars: ["武曲", "天府", "太陰", "天相"],
    name: "正財穩健型",
    text: "財富主要來自穩定的收入與長期累積，理財觀念好，愈存愈多。",
    advice: "適合定期定額、穩健型投資與不動產，避免追高殺低。",
  },
  {
    stars: ["貪狼", "破軍", "七殺"],
    name: "偏財機會型",
    text: "財運起伏大，常有投資、業績獎金或突發的機會財，來得快也去得快。",
    advice: "賺到錢先留一部分存起來，設好停損，不要把雞蛋放在同一個籃子。",
  },
  {
    stars: ["太陽", "天梁", "紫微"],
    name: "名聲專業型",
    text: "財隨名來，靠專業、職位或名聲帶來收入，地位愈高收入愈好。",
    advice: "投資自己的專業與口碑最划算，替人作保、借貸要特別謹慎。",
  },
  {
    stars: ["天機", "巨門"],
    name: "智慧口才型",
    text: "靠腦力、技術或口才賺錢，適合企劃、顧問、教學、業務等專業。",
    advice: "收入可能多變，要建立緊急預備金；簽約合作要看清條款。",
  },
  {
    stars: ["天同", "廉貞"],
    name: "人脈福氣型",
    text: "財富與人緣、交際關係密切，常因朋友或貴人得到機會。",
    advice: "好好經營人脈，但金錢往來要清楚，避免人情壓力。",
  },
];

export function wealthType(astrolabe: Astrolabe) {
  const wealth = astrolabe.palaces.find((p) => p.name === "財帛")!;
  const opposite = astrolabe.palaces[surroundedIndexes(wealth.index).opposite];
  const majors = (wealth.majorStars.length ? wealth : opposite).majorStars.map((s) => s.name);
  const type = WEALTH_TYPES.find((t) => t.stars.includes(majors[0])) ?? WEALTH_TYPES[0];
  const notes: string[] = [];
  const stars = starsOf(wealth);
  if (stars.some((s) => s.name === "祿存")) notes.push("財帛宮有祿存，守財能力好、財庫穩。");
  if (stars.some((s) => s.mutagen === "祿")) notes.push("財帛宮有化祿，賺錢的機會多。");
  if (stars.some((s) => s.mutagen === "忌")) notes.push("財帛宮有化忌，錢來得辛苦，也容易為錢煩惱。");
  if (stars.some((s) => s.name === "地空" || s.name === "地劫")) notes.push("財帛宮見空劫，容易有意外損耗，不宜投機。");
  if (stars.some((s) => s.name === "天馬")) notes.push("財帛宮有天馬，動中求財，往外跑反而賺得多。");
  const sha = stars.filter((s) => ["擎羊", "陀羅", "火星", "鈴星"].includes(s.name)).map((s) => s.name);
  if (sha.length) notes.push(`財帛宮見${sha.join("、")}，賺錢競爭多、較辛苦，花費也常來得急。`);
  return {
    ...type,
    basis: `${wealth.majorStars.length ? "財帛宮" : `財帛宮無主星，借${palaceTitle(opposite.name)}`}見${majors.join("、")}`,
    notes,
  };
}

/* ───────────── 適合行業 ───────────── */

const CAREER: Record<string, string[]> = {
  紫微: ["管理階層", "行政主管", "政治公職", "品牌經營"],
  天機: ["企劃", "資訊科技", "研究分析", "顧問"],
  太陽: ["公職", "教育", "傳播媒體", "外交公關"],
  武曲: ["金融財務", "會計", "工程技術", "製造業"],
  天同: ["服務業", "餐飲", "社福", "設計"],
  廉貞: ["公關", "法律", "電子科技", "業務談判"],
  天府: ["財務管理", "銀行", "行政", "不動產"],
  太陰: ["不動產", "設計藝術", "財務規劃", "幕後企劃"],
  貪狼: ["業務行銷", "娛樂演藝", "餐飲", "美容時尚"],
  巨門: ["法律", "教學", "業務", "諮詢顧問"],
  天相: ["行政秘書", "人資", "公關協調", "服務業"],
  天梁: ["醫療", "教育", "保險", "社會公益"],
  七殺: ["創業", "軍警", "工程", "業務開發"],
  破軍: ["創新創業", "改革專案", "運輸物流", "工程建設"],
};

export function careerFit(astrolabe: Astrolabe) {
  const pick = (name: string) => {
    const p = astrolabe.palaces.find((x) => x.name === name)!;
    const opp = astrolabe.palaces[surroundedIndexes(p.index).opposite];
    return { palace: p, majors: (p.majorStars.length ? p : opp).majorStars.map((s) => s.name) };
  };
  const career = pick("官祿");
  const soul = pick("命宮");
  const fields: string[] = [];
  for (const s of [...career.majors, ...soul.majors]) for (const f of CAREER[s] ?? []) if (!fields.includes(f)) fields.push(f);
  const hasChangqu = starsOf(career.palace).some((s) => s.name === "文昌" || s.name === "文曲");
  const workStyle = career.majors.some((s) => ["七殺", "破軍", "貪狼", "廉貞"].includes(s))
    ? "適合有挑戰性、能獨當一面或自己創業的環境。"
    : career.majors.some((s) => ["天同", "天梁", "太陰", "天相", "天府"].includes(s))
      ? "適合制度穩定的大型機構，按部就班往上走。"
      : "適合需要專業與判斷力的位置，靠能力被看見。";
  return {
    fields: fields.slice(0, 8),
    basis: `${career.palace.majorStars.length ? "官祿宮" : "官祿宮借對宮"}${career.majors.join("、")}，${soul.palace.majorStars.length ? "命宮" : "命宮借對宮"}${soul.majors.join("、")}`,
    workStyle: workStyle + (hasChangqu ? "官祿宮有昌曲，考證照、文書工作對你有利。" : ""),
  };
}
