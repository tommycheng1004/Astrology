import { ASPECTS, MAJOR_TRAITS, MUTAGEN_TEXT } from "@/lib/fortune";
import { OTHER_PALACES } from "@/lib/palaceReadings";
import { PERSONAS } from "@/lib/personality";
import type { Mutagen } from "@/content/sihua";

/** 十二宮的靜態介紹頁資料。順序即命盤上由命宮逆行排列的順序 */
export type PalaceMeta = {
  slug: string;
  /** 與 iztro 宮名相同（命宮以外不帶「宮」字） */
  key: string;
  title: string;
  alias?: string;
  /** 一句話回答「這個宮看什麼」 */
  summary: string;
  covers: string[];
  reading: string;
};

export const PALACES: PalaceMeta[] = [
  {
    slug: "ming",
    key: "命宮",
    title: "命宮",
    summary: "命宮是紫微斗數命盤的核心，看一個人的個性、才能、價值觀與一生的整體格局，論命一定從命宮開始。",
    covers: ["天生個性與思考方式", "才能與適合發揮的方向", "外在形象與給人的第一印象", "一生運勢的基本格局"],
    reading: "先看命宮主星定個性，再看三方四正（遷移、財帛、官祿）的配合。命宮無主星時借對宮遷移宮的主星來看，但力量較弱，個性也較易受環境影響。",
  },
  {
    slug: "xiongdi",
    key: "兄弟",
    title: "兄弟宮",
    summary: "兄弟宮看兄弟姊妹、同輩與合作夥伴的關係，也看彼此能給的助力；現代論命也常用來看合夥與同事緣分。",
    covers: ["兄弟姊妹的個性與感情", "手足之間的助力或牽絆", "同輩、同事與合夥人", "母親的狀況（部分流派）"],
    reading: "主星吉、會祿權科，手足和睦、同輩相助；見煞忌則易有爭執或聚少離多，合夥與金錢往來要格外清楚。",
  },
  {
    slug: "fuqi",
    key: "夫妻",
    title: "夫妻宮",
    summary: "夫妻宮看感情與婚姻：另一半的個性、你們的相處模式、感情順不順，以及容易遇到的感情課題。",
    covers: ["另一半的個性與條件", "相處模式與感情經營", "戀愛與婚姻的順逆", "適合早婚或晚婚"],
    reading: "夫妻宮的星曜多半描述「另一半的樣子」與「你在感情中的需求」。宮內見化忌或煞星不代表一定離婚，而是提醒感情需要更多經營；同時要看對宮官祿宮，事業與感情常互相牽動。",
  },
  {
    slug: "zinv",
    key: "子女",
    title: "子女宮",
    summary: "子女宮看與子女的緣分、孩子的個性與親子關係，也延伸看晚輩、學生、下屬，以及性生活與創作力。",
    covers: ["子女緣分與孩子的個性", "親子相處與教養方式", "晚輩、學生與下屬", "合夥投資與創作力"],
    reading: "子女宮與田宅宮相對，家的狀況會影響親子關係。看生育與子女時須連同夫妻宮一起看，不宜只憑單一宮位下定論。",
  },
  {
    slug: "caibo",
    key: "財帛",
    title: "財帛宮",
    summary: "財帛宮看賺錢的能力與方式、對金錢的態度，以及一生財運的起伏，是論財運最主要的宮位。",
    covers: ["賺錢的方式與能力", "理財與花錢的習慣", "財運順逆與起伏", "適合正財或偏財"],
    reading: "財帛宮看「怎麼賺錢」，田宅宮看「存不存得住」，兩宮要一起看。財帛宮與命宮、官祿宮三合，個性與事業會直接決定收入型態。",
  },
  {
    slug: "jie",
    key: "疾厄",
    title: "疾厄宮",
    summary: "疾厄宮看先天體質與身體容易出狀況的部位，也反映抗壓性與情緒狀態，用來提醒保養重點。",
    covers: ["先天體質強弱", "容易出狀況的身體部位", "抗壓性與情緒健康", "意外與災厄的提醒"],
    reading: "疾厄宮只是體質傾向的提醒，不能取代醫療診斷。星曜五行對應臟腑：例如武曲屬金對應呼吸系統、太陰屬水對應泌尿與內分泌。",
  },
  {
    slug: "qianyi",
    key: "遷移",
    title: "遷移宮",
    summary: "遷移宮是命宮的對宮，看出外發展、旅行、在外的人緣與機遇，也代表別人眼中的你。",
    covers: ["出外發展與異地運", "外出旅行與交通安全", "在外的人緣與貴人", "社會形象與表現"],
    reading: "命宮看本質，遷移宮看外在表現，兩宮一體兩面。遷移宮強的人適合離鄉或常出差；見化忌則外出宜謹慎，凡事多做準備。",
  },
  {
    slug: "puyi",
    key: "僕役",
    title: "交友宮",
    alias: "僕役宮",
    summary: "交友宮古稱僕役宮，看朋友、同事、部屬與客戶等人際關係，以及能否得到他人的助力。",
    covers: ["朋友的類型與交情深淺", "同事、部屬與客戶關係", "人際帶來的助力或拖累", "社交圈與人脈"],
    reading: "交友宮的星曜描述你身邊常出現的朋友。吉星多、會祿科，人脈即錢脈；見煞忌則容易為朋友操心，金錢往來要分清楚。",
  },
  {
    slug: "guanlu",
    key: "官祿",
    title: "官祿宮",
    alias: "事業宮",
    summary: "官祿宮又稱事業宮，看工作能力、適合的職業類型、事業發展與職場上的成就。",
    covers: ["適合的職業與行業", "工作態度與能力", "升遷、創業與事業起伏", "求學與考試運"],
    reading: "官祿宮與命宮、財帛宮三合，看事業時要三宮一起看：命宮是你這個人，官祿是你做的事，財帛是做事換來的錢。",
  },
  {
    slug: "tianzhai",
    key: "田宅",
    title: "田宅宮",
    summary: "田宅宮看不動產、居住環境與家庭氣氛，也是一個人的「財庫」，看能不能把錢存下來。",
    covers: ["置產運與不動產", "居住環境與家庭氣氛", "存錢能力（財庫）", "工作場所的環境"],
    reading: "財帛宮管進財，田宅宮管守財。田宅宮佳的人容易置產、守得住錢；見化忌或煞星則留意家宅變動與漏財。",
  },
  {
    slug: "fude",
    key: "福德",
    title: "福德宮",
    summary: "福德宮看精神生活、興趣嗜好、內心的快樂程度與福氣，也反映一個人的思想與價值觀。",
    covers: ["精神狀態與內心感受", "興趣嗜好與享受方式", "福氣與晚年生活", "思考模式與價值觀"],
    reading: "福德宮與財帛宮相對，影響用錢的態度；也與命宮、夫妻宮、遷移宮相關。福德宮佳的人懂得知足，福德宮見忌則容易想太多、不易放鬆。",
  },
  {
    slug: "fumu",
    key: "父母",
    title: "父母宮",
    summary: "父母宮看與父母、長輩的緣分與互動，也延伸看與上司、師長、政府機關的關係，以及文書與遺傳。",
    covers: ["與父母的緣分與相處", "長輩、上司與師長的關係", "文書、證照與官方往來", "遺傳與相貌"],
    reading: "父母宮與疾厄宮相對，父母的狀況常與自身體質相關。父母宮吉則長輩助力大，見煞忌則與上司或長輩溝通要多用心。",
  },
];

export const palaceBySlug = (slug: string) => PALACES.find((p) => p.slug === slug);
export const palaceByKey = (key: string) => PALACES.find((p) => p.key === key);

/** 三方四正：對宮與兩個三合宮。PALACES 依命盤順序排列，相隔 6 為對宮、相隔 4 為三合 */
export function surroundingOf(palace: PalaceMeta) {
  const i = PALACES.indexOf(palace);
  return {
    opposite: PALACES[(i + 6) % 12],
    trines: [PALACES[(i + 4) % 12], PALACES[(i + 8) % 12]],
  };
}

const aspectOf = (key: string) => ASPECTS.find((a) => a.palace === key);

/** 某主星在某宮的解讀（與排盤報告共用文字） */
export function starInPalace(star: string, key: string) {
  if (key === "命宮") return PERSONAS[star]?.text ?? "";
  const aspect = aspectOf(key);
  if (aspect) return MAJOR_TRAITS[star]?.[aspect.key] ?? "";
  return OTHER_PALACES[key]?.stars[star] ?? "";
}

/** 生年四化落在某宮的解讀 */
export function mutagenInPalace(mutagen: Mutagen, key: string) {
  const aspect = aspectOf(key);
  if (aspect) return MUTAGEN_TEXT[mutagen][aspect.key];
  const text = OTHER_PALACES[key]?.mutagen[mutagen];
  return text ? `${text}。` : "";
}
