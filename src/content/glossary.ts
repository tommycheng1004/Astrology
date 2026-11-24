/**
 * 紫微斗數術語的白話解釋。解析文字保留專業術語，第一次出現時讓讀者點開看這裡的說明。
 * 寫法：一兩句台灣日常用語，先說「這是什麼」，再說「對你代表什麼」；不嚇人、不下定論。
 * match 列出文字裡會出現的寫法；比對時長的優先（「三合宮」先於「三合」）。
 */
export const GLOSSARY_GROUPS = ["基本概念", "十二宮", "四化", "星曜亮度", "星曜"] as const;

export type GlossaryEntry = {
  group: (typeof GLOSSARY_GROUPS)[number];
  term: string;
  plain: string;
  match?: string[];
};

export const GLOSSARY: GlossaryEntry[] = [
  // ── 基本概念 ──
  { group: "基本概念", term: "主星", plain: "命盤上最重要的十四顆星（紫微、天機、太陽等），決定一個宮位的基本性質。", match: ["主星", "十四主星"] },
  { group: "基本概念", term: "無主星", plain: "這一格沒有十四主星，傳統上借正對面那一格的主星來看，影響力弱一些，也比較容易受環境左右。", match: ["沒有主星", "無主星"] },
  { group: "基本概念", term: "對宮", plain: "命盤上正對面的那一格。兩格互相影響，像同一件事的一體兩面。", match: ["對宮"] },
  { group: "基本概念", term: "三合宮", plain: "跟這一格隔四格、彼此連成三角形的兩個宮位，關係密切、會互相支援或牽動。", match: ["三合宮", "三合"] },
  { group: "基本概念", term: "三方四正", plain: "看一個宮位時，要把它本身、正對面的對宮、還有兩個三合宮一起看，共四格。就像看一個人，也要看他身邊的環境。", match: ["三方四正"] },
  { group: "基本概念", term: "沖入", plain: "對面那一格的化忌或煞星，把影響「打」過來。好比對面鄰居在吵架，聲音也傳進你家。", match: ["沖入", "沖命", "沖照"] },
  { group: "基本概念", term: "身宮", plain: "代表後天、尤其中年以後的生活重心。命宮看天生個性，身宮看你後來把力氣花在哪裡。", match: ["身宮"] },
  { group: "基本概念", term: "身命同宮", plain: "身宮和命宮在同一格：天生個性跟後天發展方向一致，想法通常會貫徹到底。", match: ["身命同宮"] },
  { group: "基本概念", term: "本命", plain: "出生那一刻排出的命盤，代表一輩子的底子；運勢則是隨時間變化的部分。", match: ["本命"] },
  { group: "基本概念", term: "大限", plain: "每十年換一次的運勢階段，可以想成人生的「十年主題」。", match: ["大限"] },
  { group: "基本概念", term: "小限", plain: "另一種看每年運勢的方法，通常跟流年一起參考。", match: ["小限"] },
  { group: "基本概念", term: "流年", plain: "某一年的運勢。", match: ["流年"] },
  { group: "基本概念", term: "流月", plain: "某一個月的運勢。", match: ["流月"] },
  { group: "基本概念", term: "流日", plain: "某一天的運勢。", match: ["流日"] },

  // ── 四化 ──
  { group: "四化", term: "四化", plain: "化祿、化權、化科、化忌四種變化，依出生年（或流年）的天干決定，會讓某些星變得更順或更卡。", match: ["四化"] },
  { group: "四化", term: "化祿", plain: "四化之一，代表順利、有機會、有收入，好比這件事多了一份資源。", match: ["化祿"] },
  { group: "四化", term: "化權", plain: "四化之一，代表主導權和企圖心，做事更有魄力，有時也會比較強勢。", match: ["化權"] },
  { group: "四化", term: "化科", plain: "四化之一，代表好名聲、貴人和條理，遇到問題比較容易化解。", match: ["化科"] },
  { group: "四化", term: "化忌", plain: "四化之一，代表執著、卡關或放不下的地方，是這輩子要花心思面對的課題，不等於一定會出事。", match: ["化忌"] },
  { group: "四化", term: "煞忌", plain: "煞星和化忌的合稱，代表這方面阻力比較多，要多留意。", match: ["煞忌"] },

  // ── 星曜亮度 ──
  { group: "星曜亮度", term: "廟旺", plain: "星的「亮度」很好，就像人在自己的主場，優點容易發揮出來。", match: ["廟旺"] },
  { group: "星曜亮度", term: "落陷", plain: "星的亮度最弱，像人在不熟悉的環境，優點打折、缺點比較明顯。", match: ["落陷"] },
  { group: "星曜亮度", term: "不得地", plain: "星的亮度偏弱，力量不太發揮得出來，需要多花點力氣。", match: ["不得地"] },

  // ── 星曜分類與合稱 ──
  { group: "星曜", term: "煞星", plain: "擎羊、陀羅、火星、鈴星、地空、地劫六顆，代表衝突、阻礙或損耗；用得好也能變成衝勁。", match: ["煞星", "六煞"] },
  { group: "星曜", term: "吉星", plain: "左輔、右弼、文昌、文曲、天魁、天鉞六顆，代表貴人和助力。", match: ["吉星", "六吉"] },
  { group: "星曜", term: "桃花星", plain: "跟人緣、異性緣有關的星，例如紅鸞、天喜、天姚、咸池、貪狼。", match: ["桃花星"] },
  { group: "星曜", term: "昌曲", plain: "文昌、文曲的合稱，跟讀書考試、文筆才藝有關，也帶一點桃花。", match: ["昌曲"] },
  { group: "星曜", term: "空劫", plain: "地空、地劫的合稱，代表突然的落空或破財，錢財上宜保守。", match: ["空劫"] },
  { group: "星曜", term: "祿馬交馳", plain: "「祿」（祿存或化祿）和天馬在一起，代表越跑越有，適合出差、跑業務、到外地發展。", match: ["祿馬交馳"] },

  // ── 輔星、煞星、雜曜 ──
  { group: "星曜", term: "左輔", plain: "吉星，代表身邊有人幫忙，同輩、同事的助力。", match: ["左輔"] },
  { group: "星曜", term: "右弼", plain: "吉星，跟左輔類似，代表有人幫襯，偏向私下、柔性的協助。", match: ["右弼"] },
  { group: "星曜", term: "文昌", plain: "吉星，跟讀書、考試、證照和文書有關。", match: ["文昌"] },
  { group: "星曜", term: "文曲", plain: "吉星，跟口才、才藝和文筆有關，也帶一點桃花。", match: ["文曲"] },
  { group: "星曜", term: "天魁", plain: "貴人星，多半是長輩、上司公開的提拔。", match: ["天魁"] },
  { group: "星曜", term: "天鉞", plain: "貴人星，多半是暗中或意想不到的幫忙。", match: ["天鉞"] },
  { group: "星曜", term: "祿存", plain: "守財的星，像一個存錢筒，代表收入穩、存得住；兩旁一定有擎羊、陀羅。", match: ["祿存"] },
  { group: "星曜", term: "天馬", plain: "代表變動和奔波，跟出差、搬家、到外地發展有關。", match: ["天馬"] },
  { group: "星曜", term: "擎羊", plain: "煞星，脾氣直、衝勁強，容易有衝突或碰撞；用在對的地方就是執行力。", match: ["擎羊"] },
  { group: "星曜", term: "陀羅", plain: "煞星，代表拖延、糾纏，事情容易反反覆覆。", match: ["陀羅"] },
  { group: "星曜", term: "火星", plain: "煞星（不是天上的火星），代表急躁和突發狀況，來得快去得也快。", match: ["火星"] },
  { group: "星曜", term: "鈴星", plain: "煞星，跟火星類似但比較悶，代表暗中的壓力、說不出口的煩惱。", match: ["鈴星"] },
  { group: "星曜", term: "地空", plain: "煞星，代表落空、想法不切實際；也有創意、看得開的一面。", match: ["地空"] },
  { group: "星曜", term: "地劫", plain: "煞星，代表突然的破財或損失，錢財上要保守。", match: ["地劫"] },
  { group: "星曜", term: "紅鸞", plain: "桃花星，主戀愛和喜事，也代表人緣好。", match: ["紅鸞"] },
  { group: "星曜", term: "天喜", plain: "桃花星，主喜事和開心的事。", match: ["天喜"] },
  { group: "星曜", term: "天姚", plain: "桃花星，代表魅力和異性緣，感情界線要守好。", match: ["天姚"] },
  { group: "星曜", term: "咸池", plain: "桃花星，偏向感官和慾望的吸引，要拿捏分寸。", match: ["咸池"] },

  // ── 格局 ──
  { group: "基本概念", term: "成格", plain: "這個格局的條件都齊了，效果比較完整。", match: ["成格"] },
  { group: "基本概念", term: "破格", plain: "有這個格局，但被其他不利的星干擾，效果打了折扣。", match: ["破格"] },

  // ── 十二宮 ──
  { group: "十二宮", term: "命宮", plain: "代表你自己：天生的個性、才能和一生的基本盤。", match: ["命宮"] },
  { group: "十二宮", term: "兄弟宮", plain: "看兄弟姊妹，也延伸看同輩、同事和合夥人。", match: ["兄弟宮"] },
  { group: "十二宮", term: "夫妻宮", plain: "看感情和婚姻：另一半的樣子、你們怎麼相處。", match: ["夫妻宮"] },
  { group: "十二宮", term: "子女宮", plain: "看子女和晚輩，也延伸看學生、部屬和合夥投資。", match: ["子女宮"] },
  { group: "十二宮", term: "財帛宮", plain: "看賺錢和花錢：靠什麼賺、理財習慣如何。", match: ["財帛宮", "財帛"] },
  { group: "十二宮", term: "疾厄宮", plain: "看健康和體質，哪些地方要多保養。", match: ["疾厄宮", "疾厄"] },
  { group: "十二宮", term: "遷移宮", plain: "看出門在外：在外面的人緣、機會，也看到外地發展順不順。", match: ["遷移宮", "遷移"] },
  { group: "十二宮", term: "交友宮", plain: "看朋友、同事、部屬等人際關係，古書叫「僕役宮」。", match: ["交友宮", "僕役宮"] },
  { group: "十二宮", term: "官祿宮", plain: "看工作和事業：適合的工作方式、職場表現。", match: ["官祿宮", "官祿"] },
  { group: "十二宮", term: "田宅宮", plain: "看家和房產：居家環境、買房，以及錢存不存得住。", match: ["田宅宮", "田宅"] },
  { group: "十二宮", term: "福德宮", plain: "看內心和精神生活：興趣、享受，心情容不容易滿足。", match: ["福德宮", "福德"] },
  { group: "十二宮", term: "父母宮", plain: "看父母和長輩，也延伸看上司、公家機關和文書。", match: ["父母宮"] },
];

const BY_MATCH = new Map<string, GlossaryEntry>();
for (const entry of GLOSSARY) for (const m of entry.match ?? [entry.term]) BY_MATCH.set(m, entry);

const PATTERN = new RegExp(
  [...BY_MATCH.keys()].sort((a, b) => b.length - a.length).join("|"),
  "g",
);

export type GlossPart = string | { text: string; entry: GlossaryEntry };

/**
 * 把多段文字切成一般文字與術語。同一組文字裡，每個術語只標第一次出現的位置，
 * 避免整段都是底線；seen 可以傳入外層已標過的術語。
 */
export function glossParts(texts: string[], seen = new Set<string>()): GlossPart[][] {
  return texts.map((text) => {
    const parts: GlossPart[] = [];
    let last = 0;
    for (const m of text.matchAll(PATTERN)) {
      const entry = BY_MATCH.get(m[0])!;
      if (seen.has(entry.term)) continue;
      seen.add(entry.term);
      if (m.index > last) parts.push(text.slice(last, m.index));
      parts.push({ text: m[0], entry });
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  });
}

/** 一組文字裡出現過的術語（不重複，依術語表的分組與順序），用於「這張盤用到的名詞」 */
export function termsIn(texts: string[]): GlossaryEntry[] {
  const found = new Map<string, GlossaryEntry>();
  for (const text of texts)
    for (const m of text.matchAll(PATTERN)) {
      const entry = BY_MATCH.get(m[0])!;
      found.set(entry.term, entry);
    }
  return GLOSSARY.filter((e) => found.has(e.term));
}
