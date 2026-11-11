import { solarToLunar } from "@/lib/lunar";
import { JIE_DAY_OFFSET, JIE_DAYS, JIE_FIRST_YEAR } from "@/lib/solarTermsData";

/**
 * 農民曆（通書）擇日最基本的幾條避忌，給紫微擇日交叉參考：
 * - 歲破：當日地支沖「年支」。農民曆以立春換年，與紫微排盤的正月初一換年不同。
 * - 月破：當日地支沖「月建」，即建除十二神的「破日」。月建以節氣（立春、驚蟄……）換月，節氣當天起算新月。
 *   通書說破日「只宜求醫治病、破屋壞垣」，所以就醫類的事不避。
 * - 農曆七月：民間俗稱鬼月，台灣習俗避開嫁娶、入宅、開市、動土、買房買車等喜事與大事。閏七月不算。
 * 節氣日期來自香港天文台曆表（見 solarTermsData.ts）。
 */

const BRANCHES = "子丑寅卯辰巳午未申酉戌亥";

/** 國曆某年某月的「節」在幾號（一月小寒、二月立春……十二月大雪）；超出 1901–2100 回傳 null */
export function jieDay(year: number, month: number) {
  const row = JIE_DAYS[year - JIE_FIRST_YEAR];
  return row ? Number(row[month - 1]) + JIE_DAY_OFFSET : null;
}

/** 立春的國曆日期，例如 2027 年是 2 月 4 日 */
export function lichunDay(year: number) {
  return jieDay(year, 2);
}

/** 月建地支：一月小寒起丑月、二月立春起寅月……十二月大雪起子月 */
export function monthBranchOf(year: number, month: number, day: number) {
  const jie = jieDay(year, month);
  if (jie === null) return null;
  return BRANCHES[(day >= jie ? month : month - 1) % 12];
}

/** 以立春換年的年支（農民曆的「太歲」） */
export function almanacYearBranchOf(year: number, month: number, day: number) {
  const lichun = lichunDay(year);
  if (lichun === null) return null;
  const y = month > 2 || (month === 2 && day >= lichun) ? year : year - 1;
  return BRANCHES[(((y - 4) % 12) + 12) % 12];
}

const clashes = (a: string, b: string) => {
  const i = BRANCHES.indexOf(a);
  const j = BRANCHES.indexOf(b);
  return i >= 0 && j >= 0 && (i + 6) % 12 === j;
};

export type FolkDay = {
  /** 歲破日：日支沖太歲 */
  suiPo: boolean;
  /** 月破日：日支沖月建 */
  yuePo: boolean;
  /** 農曆七月（不含閏七月） */
  ghost: boolean;
};

export function folkDayOf(year: number, month: number, day: number, dayBranch: string): FolkDay {
  const yearBranch = almanacYearBranchOf(year, month, day);
  const monthBranch = monthBranchOf(year, month, day);
  const lunar = solarToLunar(year, month, day);
  return {
    suiPo: yearBranch !== null && clashes(dayBranch, yearBranch),
    yuePo: monthBranch !== null && clashes(dayBranch, monthBranch),
    ghost: lunar.lunarMonth === 7 && !lunar.isLeap,
  };
}
