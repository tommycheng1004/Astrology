// 用古法安星口訣獨立驗算 iztro 排盤（升級 iztro 後請重跑）
// 執行：npx tsx scripts/verify-chart.ts（可用 N=5000 指定張數）
// 註：農曆對照用 Intl 中國曆，它在 1917、1922、1954–55、1987、1999、2012、2018、2027、2030、2070 年
//     的朔日判定與香港天文台官方曆表不同（已逐一核對，皆是 iztro 正確），這些日期出現「農曆換算」不符屬正常。
//     全區間逐日的農曆檢查見 scripts/verify-lunar.ts。
import { astro } from "iztro";

const BR = "子丑寅卯辰巳午未申酉戌亥";
const ST = "甲乙丙丁戊己庚辛壬癸";
const mod = (n: number, m = 12) => ((n % m) + m) % m;

const lunarFmt = new Intl.DateTimeFormat("zh-TW-u-ca-chinese", {
  timeZone: "Asia/Taipei", year: "numeric", month: "numeric", day: "numeric",
});
function lunarOf(y: number, m: number, d: number) {
  const parts = lunarFmt.formatToParts(new Date(Date.UTC(y, m - 1, d, 4)));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const mm = get("month");
  return {
    year: Number(get("relatedYear")),
    month: parseLunarMonth(mm),
    leap: /閏|bis/.test(mm),
    day: parseInt(get("day"), 10),
  };
}

function parseLunarMonth(text: string) {
  const t = text.replace(/[閏月]/g, "");
  const table: Record<string, number> = {
    正: 1, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
    十一: 11, 冬: 11, 十二: 12, 臘: 12, 腊: 12,
  };
  const n = table[t] ?? Number(t);
  if (!Number.isInteger(n) || n < 1 || n > 12) throw new Error(`無法解析農曆月份：${text}`);
  return n;
}

// 四化（通行版）
const SIHUA: Record<string, [string, string, string, string]> = {
  甲: ["廉貞", "破軍", "武曲", "太陽"], 乙: ["天機", "天梁", "紫微", "太陰"],
  丙: ["天同", "天機", "文昌", "廉貞"], 丁: ["太陰", "天同", "天機", "巨門"],
  戊: ["貪狼", "太陰", "右弼", "天機"], 己: ["武曲", "貪狼", "天梁", "文曲"],
  庚: ["太陽", "武曲", "太陰", "天同"], 辛: ["巨門", "太陽", "文曲", "文昌"],
  壬: ["天梁", "紫微", "左輔", "武曲"], 癸: ["破軍", "巨門", "太陰", "貪狼"],
};
const LUCUN: Record<string, string> = { 甲: "寅", 乙: "卯", 丙: "巳", 丁: "午", 戊: "巳", 己: "午", 庚: "申", 辛: "酉", 壬: "亥", 癸: "子" };
const KUIYUE: Record<string, [string, string]> = {
  甲: ["丑", "未"], 戊: ["丑", "未"], 庚: ["丑", "未"], 乙: ["子", "申"], 己: ["子", "申"],
  丙: ["亥", "酉"], 丁: ["亥", "酉"], 辛: ["午", "寅"], 壬: ["卯", "巳"], 癸: ["卯", "巳"],
};
// 命主依命宮地支、身主依生年地支（子…亥）
const SOUL_MASTER = ["貪狼", "巨門", "祿存", "文曲", "廉貞", "武曲", "破軍", "武曲", "廉貞", "文曲", "祿存", "巨門"];
const BODY_MASTER = ["火星", "天相", "天梁", "天同", "文昌", "天機", "火星", "天相", "天梁", "天同", "文昌", "天機"];
// 天官、天福依生年天干（甲…癸）
const TIANGUAN = ["未", "辰", "巳", "寅", "卯", "酉", "亥", "酉", "戌", "午"];
const TIANFU = ["酉", "申", "子", "亥", "卯", "寅", "午", "巳", "午", "巳"];
const CHANGSHENG = ["長生", "沐浴", "冠帶", "臨官", "帝旺", "衰", "病", "死", "墓", "絕", "胎", "養"];
const BOSHI = ["博士", "力士", "青龍", "小耗", "將軍", "奏書", "飛廉", "喜神", "病符", "大耗", "伏兵", "官府"];
const group = (b: number) => ["申子辰", "巳酉丑", "寅午戌", "亥卯未"].findIndex((g) => g.includes(BR[b]));
const TIANMA = ["寅", "亥", "申", "巳"]; // 申子辰→寅、巳酉丑→亥、寅午戌→申、亥卯未→巳
const HUO = ["寅", "卯", "丑", "酉"];
const LING = ["戌", "戌", "卯", "戌"];

function nayinJu(stem: number, branch: number) {
  const s = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5][stem];
  const b = [1, 1, 2, 2, 3, 3, 1, 1, 2, 2, 3, 3][branch];
  let n = s + b;
  if (n > 5) n -= 5;
  return { 1: 3, 2: 4, 3: 2, 4: 6, 5: 5 }[n]!; // 1木三局 2金四局 3水二局 4火六局 5土五局
}

let seed = 20261030;
const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
const errors: Record<string, number> = {};
const lunarMismatch: string[] = [];
const badTags = new Set<string>();
const samples: Record<string, string> = {};
const fail = (key: string, detail: string) => {
  if (key !== "農曆換算" && [...badTags].some((t) => detail.startsWith(t))) return; // 農曆基準有爭議的盤不重複計
  errors[key] = (errors[key] ?? 0) + 1;
  samples[key] ??= detail;
};

const N = Number(process.env.N ?? 3000);
const started = Date.now();
for (let i = 0; i < N; i++) {
  const y = 1900 + Math.floor(rnd() * 201), m = 1 + Math.floor(rnd() * 12);
  const d = 1 + Math.floor(rnd() * new Date(y, m, 0).getDate());
  const h = Math.floor(rnd() * 12);
  const gender = rnd() > 0.5 ? "男" : "女";
  const tag = `${y}-${m}-${d} h${h} ${gender}`;
  const a = astro.withOptions({ type: "solar", dateStr: `${y}-${m}-${d}`, timeIndex: h, gender, language: "zh-TW" });

  // 1. 農曆換算
  const L = lunarOf(y, m, d);
  const r = a.rawDates.lunarDate;
  if (r.lunarYear !== L.year || r.lunarMonth !== L.month || r.lunarDay !== L.day || r.isLeap !== L.leap) {
    lunarMismatch.push(tag);
    badTags.add(tag);
    fail("農曆換算", `${tag}: iztro ${r.lunarYear}/${r.isLeap ? "閏" : ""}${r.lunarMonth}/${r.lunarDay} vs Intl ${L.year}/${L.leap ? "閏" : ""}${L.month}/${L.day}`);
  }

  const yStem = mod(L.year - 4, 10), yBr = mod(L.year - 4);
  if (a.rawDates.chineseDate.yearly.join("") !== ST[yStem] + BR[yBr]) fail("年干支", tag);

  // 閏月：十五日以前算本月，十六日以後算下月
  const month = L.leap && L.day > 15 ? mod(L.month, 12) + 1 : L.month;
  const day = L.day;

  const branchOf = (star: string) => {
    const p = a.palaces.find((p) => [...p.majorStars, ...p.minorStars, ...p.adjectiveStars].some((s) => s.name === star));
    return p ? BR.indexOf(p.earthlyBranch) : -1;
  };
  const check = (key: string, star: string, expected: number) => {
    const got = branchOf(star);
    if (got !== mod(expected)) fail(key, `${tag}: ${star} iztro ${BR[got]} vs 古法 ${BR[mod(expected)]}`);
  };

  // 2. 命宮、身宮
  const soul = mod(2 + (month - 1) - h);
  const body = mod(2 + (month - 1) + h);
  if (a.earthlyBranchOfSoulPalace !== BR[soul]) fail("命宮", `${tag}: ${a.earthlyBranchOfSoulPalace} vs ${BR[soul]}`);
  if (a.earthlyBranchOfBodyPalace !== BR[body]) fail("身宮", `${tag}: ${a.earthlyBranchOfBodyPalace} vs ${BR[body]}`);

  // 3. 宮干（五虎遁）與五行局
  const yinStart = [2, 4, 6, 8, 0][yStem % 5];
  const stemOf = (b: number) => mod(yinStart + mod(b - 2), 10);
  for (const p of a.palaces) {
    if (p.heavenlyStem !== ST[stemOf(BR.indexOf(p.earthlyBranch))]) { fail("宮干", tag); break; }
  }
  const ju = nayinJu(stemOf(soul), soul);
  if (!a.fiveElementsClass.includes("二三四五六"[ju - 2])) fail("五行局", `${tag}: ${a.fiveElementsClass} vs ${ju}`);

  // 4. 紫微星系、天府星系
  if (!Number.isInteger(ju) || !Number.isInteger(day)) throw new Error(`輸入異常：${tag}`);
  let x = 0;
  while ((day + x) % ju !== 0) x++;
  const q = (day + x) / ju;
  const ziwei = mod(2 + (x % 2 ? q - x : q + x) - 1);
  const tianfu = mod(4 - ziwei);
  ([["紫微", 0], ["天機", -1], ["太陽", -3], ["武曲", -4], ["天同", -5], ["廉貞", -8]] as const)
    .forEach(([s, o]) => check("十四主星", s, ziwei + o));
  ([["天府", 0], ["太陰", 1], ["貪狼", 2], ["巨門", 3], ["天相", 4], ["天梁", 5], ["七殺", 6], ["破軍", 10]] as const)
    .forEach(([s, o]) => check("十四主星", s, tianfu + o));

  // 5. 六吉、六煞、祿存、天馬
  check("文昌文曲", "文昌", 10 - h);
  check("文昌文曲", "文曲", 4 + h);
  check("左輔右弼", "左輔", 4 + month - 1);
  check("左輔右弼", "右弼", 10 - (month - 1));
  const lc = BR.indexOf(LUCUN[ST[yStem]]);
  check("祿存羊陀", "祿存", lc);
  check("祿存羊陀", "擎羊", lc + 1);
  check("祿存羊陀", "陀羅", lc - 1);
  check("天魁天鉞", "天魁", BR.indexOf(KUIYUE[ST[yStem]][0]));
  check("天魁天鉞", "天鉞", BR.indexOf(KUIYUE[ST[yStem]][1]));
  const g = group(yBr);
  check("天馬", "天馬", BR.indexOf(TIANMA[g]));
  check("火星鈴星", "火星", BR.indexOf(HUO[g]) + h);
  check("火星鈴星", "鈴星", BR.indexOf(LING[g]) + h);
  check("地空地劫", "地劫", 11 + h);
  check("地空地劫", "地空", 11 - h);

  // 6. 生年四化
  SIHUA[ST[yStem]].forEach((star, k) => {
    const s = a.palaces.flatMap((p) => [...p.majorStars, ...p.minorStars]).find((s) => s.name === star);
    if (s?.mutagen !== "祿權科忌"[k]) fail("生年四化", `${tag}: ${star} 應化${"祿權科忌"[k]}，iztro 為 ${s?.mutagen || "無"}`);
  });

  // 7. 大限：陽男陰女順行，陰男陽女逆行
  const forward = (yStem % 2 === 0) === (gender === "男");
  for (let k = 0; k < 12; k++) {
    const b = mod(soul + (forward ? k : -k));
    const p = a.palaces.find((p) => p.earthlyBranch === BR[b])!;
    if (p.decadal.range[0] !== ju + k * 10) { fail("大限", `${tag}: ${BR[b]} ${p.decadal.range} vs ${ju + k * 10}`); break; }
  }

  // 8. 流年（2026 丙午）：流年命宮在午，流年四化依丙干
  const hy = a.horoscope(new Date("2026-10-30")).yearly;
  if (a.palaces[hy.index].earthlyBranch !== "午") fail("流年命宮", tag);
  if (hy.mutagen.join() !== SIHUA["丙"].join()) fail("流年四化", tag);
  if (hy.palaceNames[hy.index] !== "命宮") fail("流年宮名", tag);

  // 9. 命主、身主
  if (a.soul !== SOUL_MASTER[soul] || a.body !== BODY_MASTER[yBr]) fail("命主身主", `${tag}: ${a.soul}/${a.body} vs ${SOUL_MASTER[soul]}/${BODY_MASTER[yBr]}`);

  // 10. 雜曜
  check("紅鸞天喜", "紅鸞", 3 - yBr);
  check("紅鸞天喜", "天喜", 9 - yBr);
  check("天刑天姚", "天刑", 9 + month - 1);
  check("天刑天姚", "天姚", 1 + month - 1);
  check("天哭天虛", "天哭", 6 - yBr);
  check("天哭天虛", "天虛", 6 + yBr);
  check("龍池鳳閣", "龍池", 4 + yBr);
  check("龍池鳳閣", "鳳閣", 10 - yBr);
  const season = Math.floor(mod(yBr - 2) / 3); // 寅卯辰、巳午未、申酉戌、亥子丑
  check("孤辰寡宿", "孤辰", [5, 8, 11, 2][season]);
  check("孤辰寡宿", "寡宿", [1, 4, 7, 10][season]);
  check("台輔封誥", "台輔", 6 + h);
  check("台輔封誥", "封誥", 2 + h);
  check("三台八座", "三台", 4 + (month - 1) + (day - 1));
  check("三台八座", "八座", 10 - (month - 1) - (day - 1));
  check("恩光天貴", "恩光", 10 - h + day - 2);
  check("恩光天貴", "天貴", 4 + h + day - 2);
  check("天官天福", "天官", BR.indexOf(TIANGUAN[yStem]));
  check("天官天福", "天福", BR.indexOf(TIANFU[yStem]));
  check("天才天壽", "天才", soul + yBr);
  check("天才天壽", "天壽", body + yBr);

  // 11. 長生十二神：水二局、土五局起申，木三局起亥，金四局起巳，火六局起寅；陽男陰女順行
  const csStart = ({ 2: 8, 3: 11, 4: 5, 5: 8, 6: 2 } as Record<number, number>)[ju];
  // 12. 博士十二神：從祿存起博士，順逆同大限
  // 13. 小限：申子辰年生一歲在戌、巳酉丑在未、寅午戌在辰、亥卯未在丑；男順女逆
  const xiaoStart = [10, 7, 4, 1][g];
  for (let k = 0; k < 12; k++) {
    const at = (b: number) => a.palaces.find((p) => p.earthlyBranch === BR[mod(b)])!;
    if (at(csStart + (forward ? k : -k)).changsheng12 !== CHANGSHENG[k]) { fail("長生十二神", tag); break; }
  }
  for (let k = 0; k < 12; k++) {
    const p = a.palaces.find((p) => p.earthlyBranch === BR[mod(lc + (forward ? k : -k))])!;
    if (p.boshi12 !== BOSHI[k]) { fail("博士十二神", `${tag}: ${p.earthlyBranch} ${p.boshi12} vs ${BOSHI[k]}`); break; }
  }
  for (let k = 0; k < 12; k++) {
    const p = a.palaces.find((p) => p.earthlyBranch === BR[mod(xiaoStart + (gender === "男" ? k : -k))])!;
    if (p.ages[0] !== k + 1) { fail("小限", `${tag}: ${p.earthlyBranch} ${p.ages[0]} vs ${k + 1}`); break; }
  }
}

const items = ["農曆換算", "年干支", "命宮", "身宮", "宮干", "五行局", "十四主星", "文昌文曲", "左輔右弼", "祿存羊陀", "天魁天鉞", "天馬", "火星鈴星", "地空地劫", "生年四化", "大限", "流年命宮", "流年四化", "流年宮名",
  "命主身主", "紅鸞天喜", "天刑天姚", "天哭天虛", "龍池鳳閣", "孤辰寡宿", "台輔封誥", "三台八座", "恩光天貴", "天官天福", "天才天壽",
  "長生十二神", "博士十二神", "小限"];
console.log(`耗時 ${((Date.now() - started) / 1000).toFixed(1)} 秒`);
console.log(`驗算 ${N} 張隨機命盤（1900–2100 年，12 時辰，男女）`);
// 已知 Intl 推算有誤的農曆年份（逐一對照香港天文台曆表，皆是 iztro 正確），見 scripts/verify-lunar.ts
const INTL_WRONG_YEARS = new Set([1917, 1922, 1954, 1955, 1987, 1999, 2012, 2018, 2027, 2030, 2070]);
const unexpectedLunar = lunarMismatch.filter((t) => !INTL_WRONG_YEARS.has(Number(t.split("-")[0])));
for (const k of items) {
  if (k === "農曆換算") {
    console.log(unexpectedLunar.length
      ? `✗ 農曆換算　　 ${unexpectedLunar.length} 筆不在已核對年份內，請對照官方曆表：${unexpectedLunar.join("；")}`
      : `✓ 農曆換算　　 全部相符（另有 ${lunarMismatch.length} 筆與 Intl 不同，屬已核對的 Intl 錯誤年份）`);
    continue;
  }
  console.log(`${(errors[k] ? "✗" : "✓")} ${k.padEnd(6, "　")} ${errors[k] ? `${errors[k]} 筆不符，例：${samples[k]}` : "全部相符"}`);
}

console.log(`\n與 Intl 不同的日期（${lunarMismatch.length} 筆）：${lunarMismatch.join("；")}`);
