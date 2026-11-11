import { folkDayOf } from "@/lib/folkCalendar";
import { solarStringToLunar } from "@/lib/lunar";
import { ALL_ASPECTS, analyzeLayer, aspectByKey, gradeOf, type AspectKey, type AspectResult, type Grade } from "@/lib/fortune";
import { HOURS, horoscopeAt } from "@/lib/periods";
import { zodiacOf } from "@/lib/taisui";
import { LUNAR_DAYS, LUNAR_MONTHS, type Astrolabe } from "@/lib/ziwei";

/**
 * 紫微擇日：依流日落在哪個本命宮位、流日與流月四化、流曜，算出該日各宮位的分數，
 * 再依「要做的事」挑出相關宮位的平均分最高的日子；推薦的日子再從十二個流時挑最好的時辰。
 * 這是紫微流日的推算，和農民曆的黃道吉日是不同系統；但農民曆最基本的幾條避忌一般人都會在意，
 * 所以不列入推薦，並在名單上標明：日沖生肖（含結婚時的另一半）、歲破、月破，以及婚嫁入宅等大事避開農曆七月。
 */

const STEMS = "甲乙丙丁戊己庚辛壬癸";
const BRANCHES = "子丑寅卯辰巳午未申酉戌亥";

/** 日柱干支。2000-01-01 為戊午日（六十甲子第 55 個），已與 iztro 逐日比對 1900–2100 */
export function dayGanzhi(year: number, month: number, day: number) {
  const days = Math.round((Date.UTC(year, month - 1, day) - Date.UTC(2000, 0, 1)) / 86400000);
  const n = (((54 + days) % 60) + 60) % 60;
  return { stem: STEMS[n % 10], branch: BRANCHES[n % 12] };
}

/** 當日地支沖生年地支時，回傳農民曆寫法，例如「亥日沖蛇」 */
function clashOf(dayBranch: string, birthBranch: string) {
  const a = BRANCHES.indexOf(dayBranch);
  const b = BRANCHES.indexOf(birthBranch);
  return a >= 0 && b >= 0 && (a + 6) % 12 === b ? `${dayBranch}日沖${zodiacOf(birthBranch)}` : null;
}

export type Purpose = {
  id: string;
  label: string;
  /** 看哪些宮位，第一個是主要的 */
  keys: AspectKey[];
  /** 給使用者看的依據說明 */
  note: string;
  /** 台灣習俗避開農曆七月的事 */
  avoidGhostMonth?: boolean;
  /** 破日「宜求醫治病」：就醫類的事不避歲破、月破 */
  allowPo?: boolean;
  /** 兩個人的事（結婚）：可以加上另一半，一起避開沖對方生肖的日子 */
  couple?: boolean;
};

/**
 * 台灣常見的擇日事項，依紫微的宮位對應：事業看官祿、錢看財帛、感情看夫妻、身體看疾厄、人際看交友、
 * 房子看田宅、出門看遷移、子女看子女宮、文書考試與長輩看父母宮、心境與福分看福德。
 */
export const PURPOSE_GROUPS: { title: string; items: Purpose[] }[] = [
  {
    title: "事業與財務",
    items: [
      { id: "deal", label: "簽約・談生意", keys: ["career", "wealth"], note: "看官祿宮與財帛宮，合約與金錢都要順。" },
      { id: "money", label: "求財・投資・收款", keys: ["wealth"], note: "看財帛宮。" },
      { id: "work", label: "面試・提案・報到", keys: ["career"], note: "看官祿宮。" },
      { id: "open", label: "開業・開市・開工", keys: ["career", "wealth", "travel"], note: "看官祿、財帛與遷移宮，事業、進財與對外都要順。", avoidGhostMonth: true },
      { id: "exam", label: "考試・送件・申請", keys: ["elders", "career"], note: "看父母宮（文書、證件與長官）與官祿宮。" },
      { id: "loan", label: "借貸・合夥・作保", keys: ["social", "wealth"], note: "看交友宮與財帛宮，這類事本就宜慎，分數再高也要留退路。" },
    ],
  },
  {
    title: "感情與家庭",
    items: [
      { id: "love", label: "約會・告白", keys: ["love"], note: "看夫妻宮。" },
      { id: "wedding", label: "結婚登記・提親・訂婚", keys: ["love", "spirit"], note: "看夫妻宮為主，福德宮看兩人的福分與心情。", avoidGhostMonth: true, couple: true },
      { id: "baby", label: "求子・產檢・生產相關", keys: ["children", "health"], note: "看子女宮與疾厄宮。生產日期請以醫師的專業判斷為準，這裡只供參考。" },
      { id: "family", label: "探親・拜訪長輩・家庭聚會", keys: ["elders", "social"], note: "看父母宮與交友宮。" },
    ],
  },
  {
    title: "居住與出行",
    items: [
      { id: "move", label: "搬家・入宅・安床", keys: ["home", "spirit"], note: "看田宅宮為主，福德宮看住進去之後的心境安穩。", avoidGhostMonth: true },
      { id: "house", label: "買房・賣房・租屋簽約", keys: ["home", "wealth"], note: "看田宅宮與財帛宮。", avoidGhostMonth: true },
      { id: "build", label: "裝潢・動土・修繕", keys: ["home", "health"], note: "看田宅宮與疾厄宮，動工也要平安。", avoidGhostMonth: true },
      { id: "trip", label: "出國・旅行・出差", keys: ["travel"], note: "看遷移宮。" },
      { id: "car", label: "買車・交車", keys: ["travel", "wealth"], note: "看遷移宮與財帛宮。", avoidGhostMonth: true },
    ],
  },
  {
    title: "健康與心靈",
    items: [
      { id: "health", label: "就醫・健檢・運動", keys: ["health"], note: "看疾厄宮。農民曆說破日宜求醫治病，所以不避歲破、月破。", allowPo: true },
      { id: "surgery", label: "手術・療程", keys: ["health", "spirit"], note: "看疾厄宮與福德宮，不避歲破、月破（破日宜求醫治病）。手術時間請以醫師安排為準，這裡只供參考。", allowPo: true },
      { id: "social", label: "拜訪・請託・聚會", keys: ["social"], note: "看交友宮。" },
      { id: "pray", label: "祈福・拜拜・靜心", keys: ["spirit"], note: "看福德宮。" },
      { id: "decide", label: "重大決定・談判", keys: ["spirit", "career"], note: "看福德宮（心境是否清明）與官祿宮。" },
    ],
  },
];

export const PURPOSES: Purpose[] = PURPOSE_GROUPS.flatMap((g) => g.items);

const WEEKDAYS = "日一二三四五六";

export type HourPick = {
  hour: number;
  label: string;
  range: string;
  score: number;
  grade: Grade;
};

/** 農民曆避忌。blocks：這件事要避開，不列入推薦 */
export type DayFlag = { kind: "clash" | "partner" | "suiPo" | "yuePo" | "ghost"; text: string; blocks: boolean };

export type DayPick = {
  date: string;
  label: string;
  lunar: string;
  /** 日柱干支，例如「丙寅日」 */
  ganzhi: string;
  /** 農民曆避忌，例如「亥日沖蛇」「月破」「農曆七月」 */
  flags: DayFlag[];
  score: number;
  grade: Grade;
  reason: string;
  /** 與這件事有關的宮位，主要的排前面 */
  results: AspectResult[];
  /** 這天其他宮位的運勢，展開時可以參考 */
  others: AspectResult[];
  /** 推薦的日子才算：當天最適合的兩個時辰 */
  bestHours: HourPick[];
};

/** 幾個宮位的平均分 */
const average = (list: { score: number }[]) => Math.round(list.reduce((s, r) => s + r.score, 0) / list.length);

/** 推薦的日子裡，依這件事相關的宮位挑出最好的時辰 */
function bestHoursOf(astrolabe: Astrolabe, date: string, keys: AspectKey[]) {
  const aspects = keys.map((k) => aspectByKey(k)!);
  const picks: HourPick[] = [];
  for (const h of HOURS) {
    const horoscope = horoscopeAt(astrolabe, date, h.index);
    if (!horoscope) continue;
    const score = average(analyzeLayer(astrolabe, horoscope, "hourly", false, aspects));
    picks.push({ hour: h.index, label: h.label, range: h.range, score, grade: gradeOf(score) });
  }
  return picks.sort((a, b) => b.score - a.score || a.hour - b.hour).slice(0, 2);
}

/** 這天對這件事有哪些農民曆避忌 */
function flagsOf(purpose: Purpose, year: number, month: number, day: number, dayBranch: string, birthBranch: string, partnerBranch?: string) {
  const folk = folkDayOf(year, month, day, dayBranch);
  const flags: DayFlag[] = [];
  const clash = clashOf(dayBranch, birthBranch);
  if (clash) flags.push({ kind: "clash", text: clash, blocks: true });
  // 兩人同生肖時，沖的是同一天，不必重複標示
  const partnerClash = purpose.couple && partnerBranch && partnerBranch !== birthBranch ? clashOf(dayBranch, partnerBranch) : null;
  if (partnerClash) flags.push({ kind: "partner", text: `${partnerClash}（另一半）`, blocks: true });
  if (folk.suiPo) flags.push({ kind: "suiPo", text: "歲破", blocks: !purpose.allowPo });
  if (folk.yuePo) flags.push({ kind: "yuePo", text: "月破", blocks: !purpose.allowPo });
  if (folk.ghost) flags.push({ kind: "ghost", text: "農曆七月", blocks: !!purpose.avoidGhostMonth });
  return flags;
}

const blocked = (d: DayPick) => d.flags.some((f) => f.blocks);

/**
 * 依目的挑日子。partnerBranch：結婚時另一半的生年地支，沖對方的日子也不推薦。
 */
export function pickDays(astrolabe: Astrolabe, purposeId: string, span: number, from = new Date(), partnerBranch?: string) {
  const purpose = PURPOSES.find((p) => p.id === purposeId) ?? PURPOSES[0];
  const birthBranch = astrolabe.rawDates.chineseDate.yearly[1];
  const days: DayPick[] = [];
  for (let i = 0; i < span; i++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    const dateStr = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const h = horoscopeAt(astrolabe, dateStr, 0, { date: dateStr, hour: 11 });
    if (!h) continue;
    const all = analyzeLayer(astrolabe, h, "daily", false, ALL_ASPECTS);
    const results = purpose.keys.map((k) => all.find((r) => r.key === k)!);
    const others = all.filter((r) => !purpose.keys.includes(r.key as AspectKey));
    const lunar = solarStringToLunar(dateStr);
    const gz = dayGanzhi(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const score = average(results);
    days.push({
      date: dateStr,
      label: `${d.getFullYear() !== from.getFullYear() ? `${d.getFullYear()}/` : ""}${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）`,
      lunar: `${lunar.isLeap ? "閏" : ""}${LUNAR_MONTHS[lunar.lunarMonth - 1]}月${LUNAR_DAYS[lunar.lunarDay - 1]}`,
      ganzhi: `${gz.stem}${gz.branch}日`,
      flags: flagsOf(purpose, d.getFullYear(), d.getMonth() + 1, d.getDate(), gz.branch, birthBranch, partnerBranch),
      score,
      grade: gradeOf(score),
      reason: "",
      results,
      others,
      bestHours: [],
    });
  }
  const sorted = [...days].sort((a, b) => b.score - a.score);
  const reasonOf = (day: DayPick, tone: "good" | "bad") => day.results.flatMap((r) => r.insights).find((i) => i.tone === tone)?.text ?? "";
  // 有農民曆避忌的日子不推薦。同一天不能同時出現在兩份名單：可算的天數少時（例如出生不久），先切一半給推薦
  const candidates = sorted.filter((d) => !blocked(d));
  const bestCount = Math.min(5, Math.ceil(sorted.length / 2), candidates.length);
  const bestDays = candidates.slice(0, bestCount);
  const best = bestDays.map((d) => ({ ...d, reason: reasonOf(d, "good"), bestHours: bestHoursOf(astrolabe, d.date, purpose.keys) }));
  const avoid = sorted
    .filter((d) => !bestDays.includes(d))
    .slice(-3)
    .reverse()
    .map((d) => ({ ...d, reason: reasonOf(d, "bad") }));
  // 各種避忌各排除了幾天（同一天可能同時有好幾種）
  const LABEL: Record<DayFlag["kind"], string> = {
    clash: `沖${zodiacOf(birthBranch)}`,
    partner: partnerBranch ? `沖另一半（屬${zodiacOf(partnerBranch)}）` : "",
    suiPo: "歲破",
    yuePo: "月破",
    ghost: "農曆七月",
  };
  const excluded = (Object.keys(LABEL) as DayFlag["kind"][])
    .map((kind) => ({ kind, label: LABEL[kind], count: days.filter((d) => d.flags.some((f) => f.kind === kind && f.blocks)).length }))
    .filter((x) => x.count > 0);
  return {
    purpose,
    best,
    avoid,
    available: days.length,
    span,
    excluded,
    blockedAll: days.length > 0 && candidates.length === 0,
    zodiac: zodiacOf(birthBranch),
  };
}
