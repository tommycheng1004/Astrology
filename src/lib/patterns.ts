import type { IFunctionalPalace } from "iztro/lib/astro/FunctionalPalace";
import { starsOf } from "@/lib/chartExtras";
import { surroundedIndexes, type Astrolabe } from "@/lib/ziwei";

/**
 * 格局判定。條件依《紫微斗數全書》與通行說法，均以命宮為中心。
 * 吉格會再檢查破格：「凡諸吉格，若遇四煞劫空忌星會照，均屬破格」，
 * 實務上依煞忌輕重分為成格、成格但有干擾、破格三級（火貪、鈴貪本身含煞星，不論破格）：
 * 化忌坐命或對宮化忌沖命為破格，三合宮化忌會照為干擾。
 */

export type PatternKind = "吉格" | "凶格" | "特殊";
export type PatternStatus = "成格" | "有干擾" | "破格";

export type PatternResult = {
  name: string;
  kind: PatternKind;
  status: PatternStatus | null;
  condition: string;
  meaning: string;
  /** 破格或干擾的原因 */
  reason?: string;
};

type Ctx = {
  a: Astrolabe;
  soul: IFunctionalPalace;
  branch: string;
  around: IFunctionalPalace[];
  prev: IFunctionalPalace;
  next: IFunctionalPalace;
  soulHas: (star: string) => boolean;
  inAround: (star: string) => boolean;
  brightness: (star: string) => string;
};

type Def = {
  name: string;
  kind: PatternKind;
  condition: string;
  meaning: string;
  test: (c: Ctx) => boolean;
  /** 吉格是否要檢查破格 */
  breakable?: boolean;
};

const has = (p: IFunctionalPalace, star: string) => starsOf(p).some((s) => s.name === star);
const flankedBy = (c: Ctx, a: string, b: string) => (has(c.prev, a) && has(c.next, b)) || (has(c.prev, b) && has(c.next, a));
/** 某地支宮位是否有這顆星 */
const atBranch = (c: Ctx, branch: string, star: string) => c.a.palaces.some((p) => p.earthlyBranch === branch && has(p, star));
/** 生年祿權科（不含忌）是否落在某宮 */
const hasGoodMutagen = (p: IFunctionalPalace) => starsOf(p).some((s) => s.mutagen && s.mutagen !== "忌");
const SHA = ["擎羊", "陀羅", "火星", "鈴星", "地空", "地劫"];
/** 「拱命」：兩星分別在命宮的兩個三合宮（財帛、官祿位）相拱，或兩星同坐命宮；一在命宮、一在三合或對宮都不算 */
const pairPillars = (c: Ctx, a: string, b: string) => {
  const [t1, t2] = [c.around[2], c.around[3]];
  return (has(c.soul, a) && has(c.soul, b)) || (has(t1, a) && has(t2, b)) || (has(t1, b) && has(t2, a));
};

const DEFS: Def[] = [
  {
    name: "紫府同宮格",
    kind: "吉格",
    condition: "命宮在寅或申，紫微、天府同宮",
    meaning: "做事時既能帶頭決定方向，也願意把已有的成果照顧好。放在團隊裡，可以觀察自己是否擅長分工和管理資源。",
    test: (c) => ["寅", "申"].includes(c.branch) && c.soulHas("紫微") && c.soulHas("天府"),
    breakable: true,
  },
  {
    name: "紫府朝垣格",
    kind: "吉格",
    condition: "紫微、天府分別在命宮的兩個三合宮（財帛、官祿位）朝命",
    meaning: "需要人手或資源時，比較有機會得到主管或前輩的支持。",
    test: (c) => {
      const trines = c.around.slice(2);
      return trines.some((p) => has(p, "紫微")) && trines.some((p) => has(p, "天府"));
    },
    breakable: true,
  },
  {
    name: "君臣慶會格",
    kind: "吉格",
    condition: "紫微坐命，左輔、右弼在三方四正會照或夾命",
    meaning: "擅長把人找齊、分配工作，適合嘗試帶一個小團隊。",
    test: (c) => c.soulHas("紫微") && ((c.inAround("左輔") && c.inAround("右弼")) || flankedBy(c, "左輔", "右弼")),
    breakable: true,
  },
  {
    name: "府相朝垣格",
    kind: "吉格",
    condition: "天府、天相分別在命宮的兩個三合宮（財帛、官祿位）朝命",
    meaning: "做事穩當，容易讓人放心把重要的事交給你。",
    test: (c) => {
      const trines = c.around.slice(2);
      return trines.some((p) => has(p, "天府")) && trines.some((p) => has(p, "天相"));
    },
    breakable: true,
  },
  {
    name: "機月同梁格",
    kind: "吉格",
    condition: "天機、太陰、天同、天梁四星在命宮三方四正會齊",
    meaning: "心思細膩、重視安穩，適合公職、大企業或專業幕僚，按部就班就能發展。",
    test: (c) => ["天機", "太陰", "天同", "天梁"].every((s) => c.inAround(s)),
    breakable: true,
  },
  {
    name: "殺破狼格",
    kind: "特殊",
    condition: "七殺、破軍、貪狼其中之一坐命（三星必在三方四正相會）",
    meaning: "一生變動多、敢衝敢闖，適合開創與競爭性強的環境，起伏也比較大。",
    test: (c) => ["七殺", "破軍", "貪狼"].some((s) => c.soulHas(s)),
  },
  {
    name: "陽梁昌祿格",
    kind: "吉格",
    condition: "太陽、天梁在卯宮同宮，位於命宮或其三方四正，再會文昌與祿存（或化祿）",
    meaning: "讀書、研究和準備考試是可以發揮的方向，也適合用作品或證照讓人看見專長。",
    test: (c) =>
      c.around.some((p) => p.earthlyBranch === "卯" && has(p, "太陽") && has(p, "天梁")) &&
      c.inAround("文昌") &&
      (c.inAround("祿存") || c.around.some((p) => starsOf(p).some((s) => s.mutagen === "祿"))),
    breakable: true,
  },
  {
    name: "三奇嘉會格",
    kind: "吉格",
    condition: "生年化祿、化權、化科都在命宮三方四正",
    meaning: "這個組合傳統上同時看重三件事，取得資源、承擔責任，以及讓努力被人看見。",
    test: (c) => ["祿", "權", "科"].every((m) => c.around.some((p) => starsOf(p).some((s) => s.mutagen === m))),
    breakable: true,
  },
  {
    name: "雙祿朝垣格",
    kind: "吉格",
    condition: "祿存與化祿分別在命宮三方四正會照",
    meaning: "傳統上把這個組合解讀為收入機會較多，可以留意自己擅長經營哪一種收入來源。",
    test: (c) => {
      const lucun = c.around.find((p) => has(p, "祿存"));
      const hualu = c.around.find((p) => starsOf(p).some((s) => s.mutagen === "祿"));
      return !!lucun && !!hualu && lucun !== hualu;
    },
    breakable: true,
  },
  {
    name: "祿馬交馳格",
    kind: "吉格",
    condition: "命宮三方四正中，天馬與祿存或化祿同宮",
    meaning: "工作機會可能來自外地或需要跑動的場合，例如出差、拜訪客戶或開拓市場。",
    test: (c) => c.around.some((p) => has(p, "天馬") && (has(p, "祿存") || starsOf(p).some((s) => s.mutagen === "祿"))),
    breakable: true,
  },
  {
    name: "日月並明格",
    kind: "吉格",
    condition: "命宮在丑，太陽在巳、太陰在酉，從三合方拱照命宮",
    meaning: "容易透過與人來往建立信任，坦白表達自己的想法是可以發揮的長處。",
    test: (c) => c.branch === "丑" && atBranch(c, "巳", "太陽") && atBranch(c, "酉", "太陰"),
    breakable: true,
  },
  {
    name: "日月夾命格",
    kind: "吉格",
    condition: "命宮左右兩宮分別是太陽、太陰，且都不落陷",
    meaning: "遇到困難時，長輩或有經驗的人可能願意伸手幫忙。",
    test: (c) => flankedBy(c, "太陽", "太陰") && c.brightness("太陽") !== "陷" && c.brightness("太陰") !== "陷",
    breakable: true,
  },
  {
    name: "明珠出海格",
    kind: "吉格",
    condition: "命宮在未宮且無主星，太陽在卯、太陰在亥會照",
    meaning: "能力經過一段時間的累積，比較容易讓人看見。眼前進展慢時，可以先把手上的事做好。",
    test: (c) =>
      c.branch === "未" &&
      c.soul.majorStars.length === 0 &&
      c.a.palaces.some((p) => p.earthlyBranch === "卯" && has(p, "太陽")) &&
      c.a.palaces.some((p) => p.earthlyBranch === "亥" && has(p, "太陰")),
    breakable: true,
  },
  {
    name: "月朗天門格",
    kind: "吉格",
    condition: "太陰在亥宮坐命",
    meaning: "做事細心，適合靠專業和長期規劃累積成果。",
    test: (c) => c.branch === "亥" && c.soulHas("太陰"),
    breakable: true,
  },
  {
    name: "水澄桂萼格",
    kind: "吉格",
    condition: "太陰在子宮坐命",
    meaning: "心思細、願意慢慢學，適合需要耐心的學習或文書工作。",
    test: (c) => c.branch === "子" && c.soulHas("太陰"),
    breakable: true,
  },
  {
    name: "日照雷門格",
    kind: "吉格",
    condition: "太陽在卯宮坐命",
    meaning: "願意主動做事，有機會在工作中逐步建立名聲。",
    test: (c) => c.branch === "卯" && c.soulHas("太陽"),
    breakable: true,
  },
  {
    name: "金燦光輝格",
    kind: "吉格",
    condition: "太陽在午宮坐命",
    meaning: "在團隊裡容易成為帶頭的人。提出方向時，也可以留點時間聽聽其他人的想法。",
    test: (c) => c.branch === "午" && c.soulHas("太陽"),
    breakable: true,
  },
  {
    name: "坐貴向貴格",
    kind: "吉格",
    condition: "天魁、天鉞一在命宮、一在遷移宮",
    meaning: "換環境或遇到陌生的事時，可以主動向前輩請教，較容易得到指點。",
    test: (c) => (c.soulHas("天魁") && has(c.around[1], "天鉞")) || (c.soulHas("天鉞") && has(c.around[1], "天魁")),
    breakable: true,
  },
  {
    name: "石中隱玉格",
    kind: "吉格",
    condition: "巨門在子或午宮坐命",
    meaning: "如玉藏於石中，早年需要磨練，才華會隨時間顯現，宜低調累積實力。",
    test: (c) => ["子", "午"].includes(c.branch) && c.soulHas("巨門"),
    breakable: true,
  },
  {
    name: "雄宿朝垣格",
    kind: "吉格",
    condition: "廉貞在寅或申宮坐命",
    meaning: "有企圖心，也懂得和人協調，適合在組織裡帶人或開展自己的事業。",
    test: (c) => ["寅", "申"].includes(c.branch) && c.soulHas("廉貞"),
    breakable: true,
  },
  {
    name: "極向離明格",
    kind: "吉格",
    condition: "紫微在午宮坐命",
    meaning: "處理重要事情時容易被看見，有機會承擔帶人、做決定的角色。",
    test: (c) => c.branch === "午" && c.soulHas("紫微"),
    breakable: true,
  },
  {
    name: "英星入廟格",
    kind: "吉格",
    condition: "破軍在子或午宮坐命",
    meaning: "遇到舊方法行不通時，願意試新做法。重大改變前，先留出調整的空間。",
    test: (c) => ["子", "午"].includes(c.branch) && c.soulHas("破軍"),
    breakable: true,
  },
  {
    name: "七殺朝斗格",
    kind: "吉格",
    condition: "七殺在寅、申、子、午宮坐命",
    meaning: "遇到事情能下決定、動手做，適合獨立負責一項任務。",
    test: (c) => ["寅", "申", "子", "午"].includes(c.branch) && c.soulHas("七殺"),
    breakable: true,
  },
  {
    name: "巨日同宮格",
    kind: "吉格",
    condition: "太陽、巨門在寅或申宮同坐命宮",
    meaning: "口才與熱忱兼具，適合傳播、教學、外交等靠表達的工作。",
    test: (c) => ["寅", "申"].includes(c.branch) && c.soulHas("太陽") && c.soulHas("巨門"),
    breakable: true,
  },
  {
    name: "機巨同臨格",
    kind: "特殊",
    condition: "天機、巨門在卯或酉宮同坐命宮",
    meaning: "思考敏捷、善於分析與辯論，適合研究、企劃；也容易想太多。",
    test: (c) => ["卯", "酉"].includes(c.branch) && c.soulHas("天機") && c.soulHas("巨門"),
  },
  {
    name: "文梁振紀格",
    kind: "吉格",
    condition: "天梁與文昌或文曲同坐命宮",
    meaning: "重視原則和專業，適合需要把關或清楚解釋規則的工作，例如監察、司法或教育。",
    test: (c) => c.soulHas("天梁") && (c.soulHas("文昌") || c.soulHas("文曲")),
    breakable: true,
  },
  {
    name: "火貪格",
    kind: "吉格",
    condition: "貪狼與火星同宮，位於命宮或其三方四正",
    meaning: "容易在短時間內遇到機會。機會來時，也值得先想好怎麼保留已經取得的成果。",
    test: (c) => c.around.some((p) => has(p, "貪狼") && has(p, "火星")),
  },
  {
    name: "鈴貪格",
    kind: "吉格",
    condition: "貪狼與鈴星同宮，位於命宮或其三方四正",
    meaning: "機會可能來得突然，適合先做好準備，再決定哪些值得投入。",
    test: (c) => c.around.some((p) => has(p, "貪狼") && has(p, "鈴星")),
  },
  {
    name: "武貪格",
    kind: "吉格",
    condition: "武曲、貪狼在丑或未宮同坐命宮",
    meaning: "傳統上重視成年後累積的經驗與人脈，可以留意哪些合作讓收入逐漸穩定。",
    test: (c) => ["丑", "未"].includes(c.branch) && c.soulHas("武曲") && c.soulHas("貪狼"),
    breakable: true,
  },
  {
    name: "文桂文華格",
    kind: "吉格",
    condition: "文昌、文曲同坐命宮",
    meaning: "文采與才藝兼備，口才好、學習快，利於考試、文書與需要表達的工作。",
    test: (c) => c.soulHas("文昌") && c.soulHas("文曲"),
    breakable: true,
  },
  {
    name: "輔弼拱命格",
    kind: "吉格",
    condition: "左輔、右弼同坐命宮，或分別在命宮的兩個三合宮（財帛、官祿位）相拱",
    meaning: "一生助力多，做事有人幫襯，適合需要團隊合作的環境。",
    test: (c) => pairPillars(c, "左輔", "右弼") && !c.soulHas("紫微"),
    breakable: true,
  },
  {
    name: "魁鉞拱命格",
    kind: "吉格",
    condition: "天魁、天鉞分別在命宮的兩個三合宮（財帛、官祿位）相拱",
    meaning: "求職、考試或學習新技能時，長輩、主管或專業人士可能提供具體的幫助。",
    test: (c) => pairPillars(c, "天魁", "天鉞"),
    breakable: true,
  },
  {
    name: "科權祿夾命格",
    kind: "吉格",
    condition: "命宮左右兩宮各有生年化祿、化權、化科其中一個",
    meaning: "做事時較容易得到旁人支持，讓自己的努力和成果被看見。",
    test: (c) => hasGoodMutagen(c.prev) && hasGoodMutagen(c.next),
    breakable: true,
  },
  {
    name: "壽星入廟格",
    kind: "吉格",
    condition: "天梁在午宮坐命",
    meaning: "看重公道，也願意照顧別人，可以在需要專業判斷或服務人群的場合發揮。",
    test: (c) => c.branch === "午" && c.soulHas("天梁"),
    breakable: true,
  },
  {
    name: "左右夾命格",
    kind: "吉格",
    condition: "命宮左右兩宮分別是左輔、右弼",
    meaning: "左右有助力，人緣好，關鍵時刻常有人伸出援手。",
    test: (c) => flankedBy(c, "左輔", "右弼"),
    breakable: true,
  },
  {
    name: "昌曲夾命格",
    kind: "吉格",
    condition: "命宮左右兩宮分別是文昌、文曲",
    meaning: "文采與才華出眾，利於考試、文書與名聲。",
    test: (c) => flankedBy(c, "文昌", "文曲"),
    breakable: true,
  },
  {
    name: "泛水桃花格",
    kind: "凶格",
    condition: "貪狼在子或亥宮坐命，與擎羊或陀羅同宮",
    meaning: "在感情和應酬中容易遇到難以拿捏的情況，先說清楚自己的界線，較能減少誤會。",
    test: (c) => ["子", "亥"].includes(c.branch) && c.soulHas("貪狼") && (c.soulHas("擎羊") || c.soulHas("陀羅")),
  },
  {
    name: "風流綵杖格",
    kind: "凶格",
    condition: "貪狼在寅宮坐命，與陀羅同宮",
    meaning: "玩樂或感情有時會分散注意力，可以先把重要的事和想留給關係的時間安排好。",
    test: (c) => c.branch === "寅" && c.soulHas("貪狼") && c.soulHas("陀羅"),
  },
  {
    name: "羊陀夾忌格",
    kind: "凶格",
    condition: "命宮有生年化忌，且被擎羊、陀羅所夾",
    meaning: "壓力從四面而來，容易鑽牛角尖或受困，凡事要多留退路、穩紮穩打。",
    test: (c) => flankedBy(c, "擎羊", "陀羅") && starsOf(c.soul).some((s) => s.mutagen === "忌"),
  },
  {
    name: "空劫夾命格",
    kind: "凶格",
    condition: "命宮左右兩宮分別是地空、地劫",
    meaning: "容易有理想落空或財物損耗的經驗，宜腳踏實地、避免投機。",
    test: (c) => flankedBy(c, "地空", "地劫"),
  },
  {
    name: "火鈴夾命格",
    kind: "凶格",
    condition: "命宮左右兩宮分別是火星、鈴星",
    meaning: "個性急、容易遇到突發狀況，遇事先緩一緩再做決定。",
    test: (c) => flankedBy(c, "火星", "鈴星"),
  },
  {
    name: "日月反背格",
    kind: "凶格",
    condition: "太陽在戌、太陰在辰（日月皆落陷），且都在命宮三方四正",
    meaning: "早期的努力可能不容易被看見。幕後工作或需要耐心累積的任務，也有發揮空間。",
    test: (c) =>
      c.a.palaces.some((p) => p.earthlyBranch === "戌" && has(p, "太陽")) &&
      c.a.palaces.some((p) => p.earthlyBranch === "辰" && has(p, "太陰")) &&
      c.inAround("太陽") &&
      c.inAround("太陰"),
  },
  {
    name: "刑囚夾印格",
    kind: "凶格",
    condition: "廉貞、天相與擎羊同在命宮",
    meaning: "做事容易受到規則或他人要求牽制。遇到簽約、承諾或分工，先把責任和條件說清楚。",
    test: (c) => c.soulHas("廉貞") && c.soulHas("天相") && c.soulHas("擎羊"),
  },
  {
    name: "鈴昌陀武格",
    kind: "凶格",
    condition: "命宮在辰或戌，武曲坐命，鈴星、文昌、陀羅都在命宮三方四正",
    meaning: "傳統解讀提醒你，時間或金錢安排太緊時容易判斷失準。做重大決定前，可以多留一套備案。",
    test: (c) => ["辰", "戌"].includes(c.branch) && c.soulHas("武曲") && c.inAround("鈴星") && c.inAround("文昌") && c.inAround("陀羅"),
  },
  {
    name: "巨火擎羊格",
    kind: "凶格",
    condition: "巨門、火星、擎羊三星同坐命宮",
    meaning: "口舌是非與情緒壓力都大，容易鑽牛角尖；學會放下、適時求助，比硬撐更重要。",
    test: (c) => c.soulHas("巨門") && c.soulHas("火星") && c.soulHas("擎羊"),
  },
  {
    name: "祿逢衝破",
    kind: "凶格",
    condition: "命宮有祿存或生年化祿，同宮或對宮見地空、地劫或生年化忌",
    meaning: "面對看似有利的機會，先確認成本，以及手上能保留多少資源，再決定投入的程度。",
    test: (c) => {
      const lu = c.soulHas("祿存") || starsOf(c.soul).some((s) => s.mutagen === "祿");
      const breakers = [c.soul, c.around[1]].some(
        (p) => has(p, "地空") || has(p, "地劫") || starsOf(p).some((s) => s.mutagen === "忌"),
      );
      return lu && breakers;
    },
  },
  {
    name: "馬頭帶箭格",
    kind: "特殊",
    condition: "擎羊在午宮坐命",
    meaning: "性格剛烈、敢於競爭，早年辛苦，經得起磨練者反而能有大成就。",
    test: (c) => c.branch === "午" && c.soulHas("擎羊"),
  },
  {
    name: "命無正曜",
    kind: "特殊",
    condition: "命宮沒有十四主星，借對宮主星論",
    meaning: "容易隨環境調整做事方式。傳統上會一起看遷移宮，也就是你在外活動時的表現。",
    test: (c) => c.soul.majorStars.length === 0,
  },
];

export function analyzePatterns(astrolabe: Astrolabe): PatternResult[] {
  const soul = astrolabe.palaces.find((p) => p.name === "命宮")!;
  const rel = surroundedIndexes(soul.index);
  const around = [soul.index, rel.opposite, rel.trineA, rel.trineB].map((i) => astrolabe.palaces[i]);
  const allStars = astrolabe.palaces.flatMap(starsOf);
  const ctx: Ctx = {
    a: astrolabe,
    soul,
    branch: soul.earthlyBranch,
    around,
    prev: astrolabe.palaces[(soul.index + 11) % 12],
    next: astrolabe.palaces[(soul.index + 1) % 12],
    soulHas: (s) => has(soul, s),
    inAround: (s) => around.some((p) => has(p, s)),
    brightness: (s) => allStars.find((x) => x.name === s)?.brightness ?? "",
  };

  const jiIn = (p: IFunctionalPalace) => starsOf(p).filter((s) => s.mutagen === "忌").map((s) => s.name);
  const soulJi = jiIn(soul);
  // 對宮化忌來沖，與坐命同論破格；三合宮化忌會照，視為干擾
  const oppositeJi = jiIn(around[1]);
  const trineJi = around.slice(2).flatMap(jiIn);
  const soulSha = starsOf(soul).filter((s) => SHA.includes(s.name)).map((s) => s.name);
  const aroundSha = around.flatMap((p) => starsOf(p).filter((s) => SHA.includes(s.name)).map((s) => s.name));

  return DEFS.filter((d) => d.test(ctx)).map((d) => {
    let status: PatternStatus | null = null;
    let reason: string | undefined;
    if (d.kind === "吉格") {
      status = "成格";
      if (d.breakable) {
        if (soulJi.length) {
          status = "破格";
          reason = `命宮有${soulJi.join("、")}化忌`;
        } else if (oppositeJi.length) {
          status = "破格";
          reason = `對宮${oppositeJi.join("、")}化忌沖命`;
        } else if (soulSha.length >= 2 || aroundSha.length >= 3) {
          status = "破格";
          reason = `三方四正煞星較多（${[...new Set(aroundSha)].join("、")}）`;
        } else if (aroundSha.length > 0 || trineJi.length > 0) {
          status = "有干擾";
          reason = `三方四正見${[...new Set([...aroundSha, ...trineJi.map((s) => `${s}化忌`)])].join("、")}`;
        }
      }
    }
    return { name: d.name, kind: d.kind, status, condition: d.condition, meaning: d.meaning, reason };
  });
}
