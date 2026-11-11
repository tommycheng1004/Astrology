import { gradeOf, type Grade, type Insight, type Reading } from "@/lib/fortune";
import { singleStarText } from "@/lib/personality";
import { palaceTitle, surroundedIndexes, type Astrolabe } from "@/lib/ziwei";

/**
 * 五運以外的六個宮位：兄弟、子女、田宅、福德、父母、遷移。
 * 判斷方式與五運相同（主星與廟陷、生年四化、吉煞星），用語依各宮的含義撰寫。
 */

type Mutagen = "祿" | "權" | "科" | "忌";

type PalaceMeta = {
  noun: string;
  about: string;
  stars: Record<string, string>;
  mutagen: Record<Mutagen, string>;
  summary: Record<Grade, string>;
};

const STAR_ORDER = ["紫微", "天機", "太陽", "武曲", "天同", "廉貞", "天府", "太陰", "貪狼", "巨門", "天相", "天梁", "七殺", "破軍"];

export const OTHER_PALACES: Record<string, PalaceMeta> = {
  命宮: {
    noun: "自身",
    about: "個性、才能與一生的整體格局",
    stars: Object.fromEntries(STAR_ORDER.map((s) => [s, singleStarText(s)])),
    mutagen: {
      祿: "人緣好、機會多，一生較順遂",
      權: "有主見、企圖心強，適合掌權",
      科: "有名聲、貴人多，遇事能化解",
      忌: "個性執著、容易自尋煩惱，人生課題較多",
    },
    summary: {
      極佳: "先天條件優越，格局高。",
      良好: "先天條件不錯，發揮空間大。",
      平穩: "先天條件中等，後天努力是關鍵。",
      稍弱: "先天助力較少，要靠自己多打拚。",
      需留意: "先天挑戰較多，穩健踏實最重要。",
    },
  },
  兄弟: {
    noun: "手足同輩",
    about: "兄弟姊妹、同輩與合作夥伴",
    stars: {
      紫微: "兄弟姊妹中有能力強、有主見的人，彼此各有想法，互相尊重最重要。",
      天機: "手足感情不錯但聚少離多，彼此的想法變化快。",
      太陽: "兄弟姊妹熱心、肯幫忙，男性手足的助力較明顯。",
      武曲: "手足個性剛直，金錢往來要清楚，避免因錢起爭執。",
      天同: "手足和睦、相處融洽，能互相照應。",
      廉貞: "手足個性鮮明，關係時好時壞，宜保持適當距離。",
      天府: "手足穩重可靠，彼此是有力的後援。",
      太陰: "手足溫和細心，姊妹或女性同輩的助力較多。",
      貪狼: "手足交遊廣闊、各忙各的，感情要靠主動經營。",
      巨門: "手足之間容易有口角誤會，說話要多包容。",
      天相: "手足相處和氣，彼此互相支援。",
      天梁: "兄姊像長輩一樣照顧你，或你常照顧弟妹。",
      七殺: "手足個性強，各自獨立，彼此少有依賴。",
      破軍: "手足關係變動較大，聚散不定。",
    },
    mutagen: {
      祿: "手足或同輩能帶來助力與資源",
      權: "手足中有強勢的人，或你在同輩中較有主導權",
      科: "手足相處講道理，彼此名聲互相加分",
      忌: "與手足或合夥人之間容易有牽絆，金錢往來要清楚",
    },
    summary: {
      極佳: "手足同輩是你的強大後援。",
      良好: "手足關係和睦，能互相幫忙。",
      平穩: "手足關係平平，各自生活。",
      稍弱: "手足助力有限，凡事多靠自己。",
      需留意: "與手足或合夥人容易有摩擦，金錢往來要謹慎。",
    },
  },
  子女: {
    noun: "子女晚輩",
    about: "子女、晚輩，也代表創造力",
    stars: {
      紫微: "子女有主見、自尊心強，教養宜多鼓勵、少命令。",
      天機: "子女聰明伶俐、反應快，但情緒較敏感。",
      太陽: "子女活潑外向、熱心，老大的表現較突出。",
      武曲: "子女個性剛強獨立，管教上容易有衝突。",
      天同: "子女乖巧貼心，親子相處愉快。",
      廉貞: "子女個性鮮明、有主見，需要耐心溝通。",
      天府: "子女穩重懂事，將來能有所成。",
      太陰: "子女溫柔細膩，與母親較親近。",
      貪狼: "子女多才多藝、愛玩，需要引導專注。",
      巨門: "親子之間容易有代溝，多傾聽、少說教。",
      天相: "子女懂事守規矩，親子關係和諧。",
      天梁: "子女早熟懂事，你也很會照顧晚輩。",
      七殺: "子女個性強、有主見，宜給他們發展的空間。",
      破軍: "子女個性叛逆、愛冒險，親子互動起伏較大。",
    },
    mutagen: {
      祿: "與子女緣分深，子女是你的福氣",
      權: "子女有主見，教養上容易爭主導",
      科: "子女聰明，讀書運不錯",
      忌: "為子女操心較多，或子女緣較晚",
    },
    summary: {
      極佳: "子女緣深，晚輩能帶來福氣。",
      良好: "親子關係融洽。",
      平穩: "親子關係平穩，需要用心經營。",
      稍弱: "子女需要多花心力照顧。",
      需留意: "為子女操心多，溝通要更有耐心。",
    },
  },
  田宅: {
    noun: "家宅置產",
    about: "家庭氛圍、居住環境與不動產",
    stars: {
      紫微: "重視居家品味，有機會擁有像樣的房產。",
      天機: "住處容易變動，搬家次數較多。",
      太陽: "居家明亮開闊，家中氣氛熱鬧。",
      武曲: "能靠自己的努力置產，不動產有增值機會。",
      天同: "家庭和樂溫馨，晚年多能安居。",
      廉貞: "居家環境變化多，家人之間偶有摩擦。",
      天府: "財庫穩，容易累積不動產，家底豐厚。",
      太陰: "太陰是田宅主，置產運佳，居家講究舒適。",
      貪狼: "居家喜歡熱鬧與享受，置產多半要靠後天努力。",
      巨門: "家中容易有口舌，買房簽約要仔細。",
      天相: "居家整潔有序，有機會繼承或分得家產。",
      天梁: "容易得到祖業或長輩庇蔭，居住環境穩定。",
      七殺: "早年住處變動多，靠自己打拚才置產。",
      破軍: "不動產有先破後成之象，買賣與搬遷較頻繁。",
    },
    mutagen: {
      祿: "置產運好，家中容易有進帳",
      權: "對家中事務有主導權，適合投資不動產",
      科: "居家環境整潔有質感",
      忌: "家宅容易有煩惱，置產與搬家要多評估",
    },
    summary: {
      極佳: "家運興旺，置產運佳。",
      良好: "居家安穩，有置產機會。",
      平穩: "家宅平穩，置產量力而為。",
      稍弱: "居家容易有變動，買房前多評估。",
      需留意: "家宅事務容易煩心，不動產投資要保守。",
    },
  },
  福德: {
    noun: "精神生活",
    about: "內心感受、興趣嗜好與福氣",
    stars: {
      紫微: "精神層次高，重視品味與自我實現。",
      天機: "心思多、常想東想西，適合培養靜心的興趣。",
      太陽: "樂觀開朗，喜歡忙碌，閒不下來。",
      武曲: "勞心勞力，快樂來自實際的成就感。",
      天同: "天同是福德主，懂得享受生活，福氣深厚。",
      廉貞: "內心情緒起伏大，需要找到抒發的管道。",
      天府: "心態穩定知足，晚年享福。",
      太陰: "內心細膩浪漫，重視精神上的滿足。",
      貪狼: "興趣廣泛、愛享受，物質慾望較強。",
      巨門: "容易煩惱多、想不開，宜多與人交流。",
      天相: "心態平和，重視生活的秩序與品味。",
      天梁: "心胸寬大，對宗教或哲學有興趣，福氣好。",
      七殺: "內心不安定、閒不下來，總想追求挑戰。",
      破軍: "想法多變，喜歡追求新鮮刺激。",
    },
    mutagen: {
      祿: "懂得享福，心情容易滿足",
      權: "對自己要求高，閒不下來",
      科: "心態平和、有修養",
      忌: "容易鑽牛角尖、想不開，要多找人聊聊",
    },
    summary: {
      極佳: "心靈富足，懂得享受人生。",
      良好: "心態不錯，能找到生活樂趣。",
      平穩: "精神生活平穩。",
      稍弱: "容易操心，要多照顧自己的情緒。",
      需留意: "內心壓力較大，建議培養紓壓的習慣。",
    },
  },
  父母: {
    noun: "長輩",
    about: "父母、長官，以及文書證件",
    stars: {
      紫微: "父母有地位或個性強，家教較嚴。",
      天機: "與父母的想法常有落差，溝通要有耐心。",
      太陽: "與父親緣分較深，父親的影響明顯。",
      武曲: "父母務實嚴格，早年家教偏重紀律。",
      天同: "父母慈祥，與長輩相處融洽。",
      廉貞: "與父母關係時好時壞，彼此要多體諒。",
      天府: "父母穩重、有照顧能力，能得到家庭庇蔭。",
      太陰: "與母親緣分較深，母親的影響明顯。",
      貪狼: "父母交遊廣闊，與長輩相處要拿捏分寸。",
      巨門: "與父母容易有口角或代溝，多溝通、少爭辯。",
      天相: "父母講道理，與長官的關係也不錯。",
      天梁: "長輩緣極佳，常得到長官與前輩提攜。",
      七殺: "與父母個性都強，容易有衝突，宜早點獨立。",
      破軍: "與父母緣分起伏，早年家庭可能有變動。",
    },
    mutagen: {
      祿: "得父母與長輩疼愛、資助",
      權: "父母較強勢，或長官管得嚴",
      科: "與長輩關係和諧，文書證件順利",
      忌: "與父母、長官容易有心結，文書證件要仔細",
    },
    summary: {
      極佳: "長輩緣極佳，常得提攜。",
      良好: "與父母、長官相處融洽。",
      平穩: "與長輩關係平穩。",
      稍弱: "與長輩的想法容易有落差。",
      需留意: "與父母或長官容易有心結，宜多體諒溝通。",
    },
  },
  遷移: {
    noun: "出外發展",
    about: "外出、在外地的發展與社會上的表現",
    stars: {
      紫微: "在外受人尊重，出外發展容易遇到貴人。",
      天機: "常往外跑，在外適合動腦與企劃的工作。",
      太陽: "出外人緣好、名聲響亮，適合往外發展。",
      武曲: "在外能靠實力打出一片天，出外求財有利。",
      天同: "在外得人緣、有口福，出外平順。",
      廉貞: "在外交際應酬多，人際關係要謹慎經營。",
      天府: "出外穩當，容易得到資源與照顧。",
      太陰: "在外表現溫和得體，適合在外地安定發展。",
      貪狼: "在外交遊廣闊、機會多，也要注意誘惑。",
      巨門: "在外容易遇到是非口舌，凡事三思而後言。",
      天相: "在外能得到他人信任，適合擔任協調角色。",
      天梁: "出外常有貴人照顧，遇事能逢凶化吉。",
      七殺: "在外奔波辛勞，適合到外地闖蕩打拚。",
      破軍: "出外變動大，適合離鄉發展、開創新局。",
    },
    mutagen: {
      祿: "出外有財有機會，適合往外發展",
      權: "在外有影響力，適合到外地掌權",
      科: "在外有好名聲",
      忌: "在外容易遇到阻礙或是非，出遠門要多注意安全",
    },
    summary: {
      極佳: "出外發展順利，適合往外闖。",
      良好: "在外人緣好，機會不少。",
      平穩: "在外表現平穩。",
      稍弱: "出外辛勞，凡事多準備。",
      需留意: "在外容易遇到阻礙，出行要多注意。",
    },
  },
};

const MUTAGEN_WEIGHT: Record<Mutagen, number> = { 祿: 3, 權: 2, 科: 1.5, 忌: -3 };
const BRIGHTNESS_WEIGHT: Record<string, number> = { 廟: 2, 旺: 1.5, 得: 1, 利: 0.5, 平: 0, 不: -0.5, 陷: -1 };

export function readOtherPalace(astrolabe: Astrolabe, name: string): Reading {
  const meta = OTHER_PALACES[name];
  const palace = astrolabe.palaces.find((p) => p.name === name)!;
  const rel = surroundedIndexes(palace.index);
  const opposite = astrolabe.palaces[rel.opposite];
  const trines = [rel.trineA, rel.trineB].map((i) => astrolabe.palaces[i]);
  const insights: Insight[] = [];
  let raw = 0;

  const borrowed = palace.majorStars.length === 0;
  const majors = borrowed ? opposite.majorStars : palace.majorStars;
  if (borrowed)
    insights.push({
      tone: "neutral",
      text: `${palaceTitle(name)}沒有主星，借對宮${palaceTitle(opposite.name)}的${majors.map((s) => s.name).join("、")}來看。`,
    });
  majors.forEach((s, i) => {
    const lead = borrowed ? `借入的${s.name}，` : i === 0 ? `${palaceTitle(name)}見${s.name}，` : `同宮還有${s.name}，`;
    if (meta.stars[s.name]) insights.push({ tone: "neutral", text: lead + meta.stars[s.name] });
  });
  if (majors.length)
    raw +=
      (majors.reduce((sum, s) => sum + (BRIGHTNESS_WEIGHT[s.brightness ?? ""] ?? 0), 0) / majors.length) * (borrowed ? 0.6 : 1);

  for (const s of [...palace.majorStars, ...palace.minorStars]) {
    const m = s.mutagen as Mutagen;
    if (!(m in MUTAGEN_WEIGHT)) continue;
    raw += MUTAGEN_WEIGHT[m];
    insights.push({ tone: m === "忌" ? "bad" : "good", text: `${s.name}化${m}在${palaceTitle(name)}，${meta.mutagen[m]}。` });
  }
  for (const s of [...opposite.majorStars, ...opposite.minorStars]) {
    if (s.mutagen === "忌") {
      raw -= 1.8;
      insights.push({ tone: "bad", text: `對宮${s.name}化忌沖入，${meta.noun}方面容易受外力干擾。` });
    } else if (s.mutagen && s.mutagen in MUTAGEN_WEIGHT) raw += MUTAGEN_WEIGHT[s.mutagen as Mutagen] * 0.6;
  }
  for (const t of trines)
    for (const s of [...t.majorStars, ...t.minorStars])
      if (s.mutagen && s.mutagen in MUTAGEN_WEIGHT) raw += MUTAGEN_WEIGHT[s.mutagen as Mutagen] * 0.4;

  const soft = palace.minorStars.filter((s) => s.type === "soft" || s.type === "lucun");
  const tough = palace.minorStars.filter((s) => s.type === "tough");
  if (soft.length) {
    raw += soft.length;
    insights.push({ tone: "good", text: `${soft.map((s) => s.name).join("、")}同宮，${meta.noun}方面多一份助力。` });
  }
  if (tough.length) {
    raw -= tough.length * 1.2;
    insights.push({ tone: "bad", text: `${tough.map((s) => s.name).join("、")}同宮，${meta.noun}方面容易有摩擦或波折。` });
  }

  const score = Math.round(Math.min(95, Math.max(12, 50 + raw * 6.5)));
  const level = gradeOf(score);
  return {
    key: name,
    label: palaceTitle(name),
    palaceIndex: palace.index,
    palaceLabel: `${palaceTitle(name)}・${palace.heavenlyStem}${palace.earthlyBranch}`,
    score,
    level,
    summary: meta.summary[level],
    insights,
  };
}
