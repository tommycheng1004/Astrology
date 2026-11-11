/**
 * 生肖犯太歲（民俗說法，台灣命理網站常見）：值、沖、刑、害、破。
 * 刑：子卯相刑；寅巳申、丑戌未三刑；辰午酉亥自刑。
 */

const BRANCHES = "子丑寅卯辰巳午未申酉戌亥";
export const ZODIAC = "鼠牛虎兔龍蛇馬羊猴雞狗豬";

const HAI = ["子未", "丑午", "寅巳", "卯辰", "申亥", "酉戌"];
const PO = ["子酉", "卯午", "辰丑", "未戌", "寅亥", "巳申"];
const XING_GROUPS = ["寅巳申", "丑戌未"];
const SELF_XING = "辰午酉亥";

export type Taisui = "值" | "沖" | "刑" | "害" | "破";

const pair = (list: string[], a: string, b: string) => list.some((p) => p === a + b || p === b + a);

export function taisuiOf(birthBranch: string, yearBranch: string): Taisui[] {
  const kinds: Taisui[] = [];
  const a = BRANCHES.indexOf(birthBranch);
  const b = BRANCHES.indexOf(yearBranch);
  if (a < 0 || b < 0) return kinds;
  if (a === b) kinds.push("值");
  if ((a + 6) % 12 === b) kinds.push("沖");
  const xing =
    (a === b && SELF_XING.includes(birthBranch)) ||
    pair(["子卯"], birthBranch, yearBranch) ||
    XING_GROUPS.some((g) => a !== b && g.includes(birthBranch) && g.includes(yearBranch));
  if (xing) kinds.push("刑");
  if (pair(HAI, birthBranch, yearBranch)) kinds.push("害");
  if (pair(PO, birthBranch, yearBranch)) kinds.push("破");
  return kinds;
}

const TEXT: Record<Taisui, string> = {
  值: "本命年值太歲，生活容易有變動，凡事求穩",
  沖: "沖太歲，容易有搬遷、換工作或人事衝突，重大決定多想一想",
  刑: "刑太歲，留意是非口舌與小傷，言行多一分謹慎",
  害: "害太歲，容易遇到小人或人際摩擦，交友要謹慎",
  破: "破太歲，容易破財或計畫生變，理財保守為宜",
};

export function taisuiText(kinds: Taisui[]) {
  return kinds.map((k) => TEXT[k]).join("；") + "。";
}

export function zodiacOf(branch: string) {
  return ZODIAC[BRANCHES.indexOf(branch)] ?? "";
}
