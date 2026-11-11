import { MUTAGENS, SIHUA, type Mutagen } from "@/content/sihua";
import { lichunDay } from "@/lib/folkCalendar";
import { leapMonthOf, lunarToSolar, solarToLunar } from "@/lib/lunar";
import { yearGanzhi } from "@/lib/periods";
import { taisuiOf, taisuiText, ZODIAC, type Taisui } from "@/lib/taisui";
import { LUNAR_MONTHS } from "@/lib/ziwei";

/**
 * 流年頁（/liunian/2027）的資料：干支、春節與立春、閏月、農曆七月、流年四化、犯太歲。
 * 全部由曆表與規則算出，不寫死某一年的內容。
 */

const BRANCHES = "子丑寅卯辰巳午未申酉戌亥";

/** 現在的農曆年 */
function lunarYearNow(now: Date) {
  return solarToLunar(now.getFullYear(), now.getMonth() + 1, now.getDate()).lunarYear;
}

/** 建置時產生的流年頁：今年起三年 */
export function liunianYears(now = new Date()) {
  const y = lunarYearNow(now);
  return [y, y + 1, y + 2];
}

/** 首頁要推的流年：農曆十月起推明年（年底大家開始查明年運勢），其餘時間推今年 */
export function featuredYear(now = new Date()) {
  const lunar = solarToLunar(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return lunar.lunarMonth >= 10 ? lunar.lunarYear + 1 : lunar.lunarYear;
}

/** 流年四化各星的主題，用來說明「這顆星化祿／忌」大致應在什麼事情上 */
const STAR_THEME: Record<string, string> = {
  紫微: "地位、主導權與面子",
  天機: "計畫、變動與思考",
  太陽: "名聲、事業表現與男性長輩",
  武曲: "現金、財務與執行力",
  天同: "福氣、享受與心情",
  廉貞: "人際分寸、規範與情緒",
  天府: "積蓄與守成",
  太陰: "積蓄、房產、家庭與女性",
  貪狼: "人緣、慾望、才藝與桃花",
  巨門: "口舌、溝通與是非",
  天相: "合作與協調",
  天梁: "長輩、庇蔭與化解",
  七殺: "開創與衝勁",
  破軍: "破舊立新與耗損",
  文昌: "文書、考試與契約",
  文曲: "口才、才藝與文書",
  左輔: "助力與團隊",
  右弼: "助力與貴人",
};

const MUTAGEN_EFFECT: Record<Mutagen, string> = {
  祿: "這方面較順，有收穫與機會",
  權: "這方面想掌控、變積極，也伴隨壓力與責任",
  科: "這方面容易有好名聲、遇到貴人，問題能化解",
  忌: "這方面容易卡關、操心，是今年要多留意的課題",
};

/** 某年出生、屬這個生肖的民國年次（民國 30–115 年），例如屬羊：32、44、56… */
function rocBirthYears(branchIndex: number, max: number) {
  const list: number[] = [];
  for (let y = 1941; y <= max; y++) if ((((y - 4) % 12) + 12) % 12 === branchIndex) list.push(y - 1911);
  return list;
}

const md = (s: { solarMonth: number; solarDay: number }) => `${s.solarMonth}/${s.solarDay}`;

export type LiunianInfo = ReturnType<typeof liunianInfo>;

export function liunianInfo(year: number) {
  const ganzhi = yearGanzhi(year);
  const stem = ganzhi[0] as keyof typeof SIHUA;
  const branch = ganzhi[1];
  const branchIndex = BRANCHES.indexOf(branch);
  const zodiac = ZODIAC[branchIndex];

  const newYear = lunarToSolar(year, 1, 1);
  const next = lunarToSolar(year + 1, 1, 1);
  const eve = new Date(Date.UTC(next.solarYear, next.solarMonth - 1, next.solarDay - 1));
  const lichun = lichunDay(year)!;
  const leap = leapMonthOf(year);

  // 農曆七月（不含閏七月）：七月初一到八月初一前一天
  const ghostFrom = lunarToSolar(year, 7, 1);
  const eighth = lunarToSolar(year, 8, 1);
  const ghostEnd = new Date(Date.UTC(eighth.solarYear, eighth.solarMonth - 1, eighth.solarDay - 1));
  // 有閏七月時，八月初一前一天會落在閏七月，改以七月本身的最後一天為準
  const ghostTo =
    leap === 7
      ? (() => {
          const leap7 = lunarToSolar(year, 7, 1, true);
          const d = new Date(Date.UTC(leap7.solarYear, leap7.solarMonth - 1, leap7.solarDay - 1));
          return { solarMonth: d.getUTCMonth() + 1, solarDay: d.getUTCDate() };
        })()
      : { solarMonth: ghostEnd.getUTCMonth() + 1, solarDay: ghostEnd.getUTCDate() };

  const sihua = SIHUA[stem].map((star, i) => ({
    star,
    mutagen: MUTAGENS[i],
    text: `${STAR_THEME[star] ?? star}：${MUTAGEN_EFFECT[MUTAGENS[i]]}`,
  }));

  const taisui = [...BRANCHES]
    .map((b, i) => ({ zodiac: ZODIAC[i], branch: b, kinds: taisuiOf(b, branch) as Taisui[], years: rocBirthYears(i, year - 1) }))
    .filter((x) => x.kinds.length > 0)
    .map((x) => ({ ...x, label: `${x.kinds.join("、")}太歲`, text: taisuiText(x.kinds) }))
    // 值太歲排第一，其餘依沖、刑、害、破
    .sort((a, b) => "值沖刑害破".indexOf(a.kinds[0]) - "值沖刑害破".indexOf(b.kinds[0]));

  return {
    year,
    roc: year - 1911,
    ganzhi,
    stem,
    branch,
    zodiac,
    newYear: `${newYear.solarYear}/${md(newYear)}`,
    newYearShort: md(newYear),
    eve: `${eve.getUTCFullYear()}/${eve.getUTCMonth() + 1}/${eve.getUTCDate()}`,
    lichun: `${year}/2/${lichun}`,
    lichunShort: `2/${lichun}`,
    /** 立春比春節早：中間這幾天八字與農民曆已換年，紫微與生肖還沒換；反之則相反 */
    lichunFirst: Date.UTC(year, 1, lichun) < Date.UTC(newYear.solarYear, newYear.solarMonth - 1, newYear.solarDay),
    leap: leap ? `閏${LUNAR_MONTHS[leap - 1]}月` : null,
    ghost: `${md(ghostFrom)}–${md(ghostTo)}`,
    sihua,
    taisui,
  };
}
