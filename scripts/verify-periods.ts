// 以古訣獨立驗算 iztro 的流月、流日、流時（擇日與運勢都靠這些），以及流曜與各層四化。
// 執行：npx tsx scripts/verify-periods.ts（可用 N=5000 指定張數）
//
// 古訣：
// - 斗君：從流年命宮（流年地支宮）起正月，逆數至生月；再從該宮起子時，順數至生時，即正月流月命宮，之後每月順行一宮。
//   閏月以十五日為界：十六日以後算下個月（生月與流月皆同）。
// - 流日：從流月命宮起初一，每日順行一宮。流時：從流日命宮起子時，每時辰順行一宮。
// - 月干：五虎遁（甲己之年丙作首、乙庚戊、丙辛庚、丁壬壬、戊癸甲），閏月十六日以後取下月干。
// - 日干支：由 2000-01-01 戊午日推算（dateSelect.ts，已逐日比對）。
// - 流曜：祿存（甲寅乙卯丙戊巳丁己午庚申辛酉壬亥癸子）、擎羊祿前、陀羅祿後、天馬（寅午戌申、申子辰寅、巳酉丑亥、亥卯未巳）、
//   紅鸞（卯起逆數至地支）、天喜對宮、天魁天鉞（甲戊庚丑未、乙己子申、丙丁亥酉、壬癸卯巳、辛午寅）、
//   流昌流曲（甲巳酉、乙午申、丙申午、丁酉巳、戊申午、己酉巳、庚亥卯、辛子寅、壬寅子、癸卯亥）。
import { astro } from "iztro";
import { dayGanzhi, pickDays } from "../src/lib/dateSelect";
import { STEM_MUTAGENS } from "../src/lib/chartExtras";
import { solarToLunar } from "../src/lib/lunar";
import type { Astrolabe } from "../src/lib/ziwei";

const N = Number(process.env.N ?? 3000);
const CFG = { algorithm: "default", yearDivide: "normal", horoscopeDivide: "normal", ageDivide: "normal", dayDivide: "forward" } as const;
const STEMS = "甲乙丙丁戊己庚辛壬癸";
const BRANCHES = "子丑寅卯辰巳午未申酉戌亥";
const palaceOfBranch = (b: string) => (BRANCHES.indexOf(b) + 10) % 12; // 宮位索引 0 = 寅
const fix = (i: number) => ((i % 12) + 12) % 12;

let seed = 20261111;
const rnd = (n: number) => (seed = (seed * 48271) % 2147483647) % n;

const LU: Record<string, string> = { 甲: "寅", 乙: "卯", 丙: "巳", 丁: "午", 戊: "巳", 己: "午", 庚: "申", 辛: "酉", 壬: "亥", 癸: "子" };
const MA: Record<string, string> = { 寅: "申", 午: "申", 戌: "申", 申: "寅", 子: "寅", 辰: "寅", 巳: "亥", 酉: "亥", 丑: "亥", 亥: "巳", 卯: "巳", 未: "巳" };
const KUI: Record<string, [string, string]> = { 甲: ["丑", "未"], 戊: ["丑", "未"], 庚: ["丑", "未"], 乙: ["子", "申"], 己: ["子", "申"], 丙: ["亥", "酉"], 丁: ["亥", "酉"], 壬: ["卯", "巳"], 癸: ["卯", "巳"], 辛: ["午", "寅"] };
const CHANGQU: Record<string, [string, string]> = { 甲: ["巳", "酉"], 乙: ["午", "申"], 丙: ["申", "午"], 丁: ["酉", "巳"], 戊: ["申", "午"], 己: ["酉", "巳"], 庚: ["亥", "卯"], 辛: ["子", "寅"], 壬: ["寅", "子"], 癸: ["卯", "亥"] };
const FIVE_TIGER: Record<string, string> = { 甲: "丙", 己: "丙", 乙: "戊", 庚: "戊", 丙: "庚", 辛: "庚", 丁: "壬", 壬: "壬", 戊: "甲", 癸: "甲" };

/** 流曜依干支應落的宮位：星名尾字 → 宮位索引 */
function expectedStars(stem: string, branch: string) {
  const lu = BRANCHES.indexOf(LU[stem]);
  const luan = fix(BRANCHES.indexOf("卯") - BRANCHES.indexOf(branch));
  return {
    祿: palaceOfBranch(LU[stem]),
    羊: fix(palaceOfBranch(LU[stem]) + 1),
    陀: fix(palaceOfBranch(LU[stem]) - 1),
    馬: palaceOfBranch(MA[branch]),
    鸞: fix(luan - 2),
    喜: fix(luan - 2 + 6),
    魁: palaceOfBranch(KUI[stem][0]),
    鉞: palaceOfBranch(KUI[stem][1]),
    昌: palaceOfBranch(CHANGQU[stem][0]),
    曲: palaceOfBranch(CHANGQU[stem][1]),
  } as Record<string, number>;
  void lu;
}

const fails: Record<string, string[]> = {};
const fail = (key: string, msg: string) => ((fails[key] ??= []).length < 5 ? fails[key].push(msg) : fails[key].push(""));
const keys = ["流月命宮", "流日命宮", "流時命宮", "月干與流月四化", "日干與流日四化", "時干與流時四化", "流日流曜", "流月流曜", "流時流曜"];
keys.forEach((k) => (fails[k] = []));

let checked = 0;
for (let i = 0; i < N; i++) {
  const by = 1900 + rnd(190), bm = 1 + rnd(12), bd = 1 + rnd(28), bt = rnd(12);
  const a: Astrolabe = astro.withOptions({ type: "solar", dateStr: `${by}-${bm}-${bd}`, timeIndex: bt, gender: rnd(2) ? "男" : "女", fixLeap: true, language: "zh-TW", config: CFG });
  const ty = by + 1 + rnd(90), tm = 1 + rnd(12), td = 1 + rnd(28), th = rnd(12);
  if (ty > 2099) continue;
  const date = `${ty}-${tm}-${td}`;
  let h;
  try {
    h = a.horoscope(date, th);
  } catch {
    continue;
  }
  if (h.age.nominalAge > 120 || h.decadal.index < 0) continue;
  checked++;
  const tag = `${a.solarDate} ${BRANCHES[bt]}時 → ${date} ${BRANCHES[th]}時`;

  // 斗君
  const birth = a.rawDates.lunarDate;
  const target = solarToLunar(ty, tm, td);
  const bMonth = birth.lunarMonth + (birth.isLeap && birth.lunarDay > 15 ? 1 : 0);
  const tMonth = target.lunarMonth + (target.isLeap && target.lunarDay > 15 ? 1 : 0);
  const yearIdx = palaceOfBranch(BRANCHES[(((target.lunarYear - 4) % 12) + 12) % 12]);
  const monthIdx = fix(yearIdx - (bMonth - 1) + bt + (tMonth - 1));
  const dayIdx = fix(monthIdx + target.lunarDay - 1);
  const hourIdx = fix(dayIdx + th);
  if (h.monthly.index !== monthIdx) fail("流月命宮", `${tag} 古訣 ${monthIdx} iztro ${h.monthly.index}`);
  if (h.daily.index !== dayIdx) fail("流日命宮", `${tag} 古訣 ${dayIdx} iztro ${h.daily.index}`);
  if (h.hourly.index !== hourIdx) fail("流時命宮", `${tag} 古訣 ${hourIdx} iztro ${h.hourly.index}`);

  // 月干、日干、時干與四化
  const yearStem = STEMS[(((target.lunarYear - 4) % 10) + 10) % 10];
  const monthStem = STEMS[(STEMS.indexOf(FIVE_TIGER[yearStem]) + tMonth - 1) % 10];
  const monthBranch = BRANCHES[(tMonth + 1) % 12];
  const day = dayGanzhi(ty, tm, td);
  const hourStem = STEMS[((STEMS.indexOf(day.stem) % 5) * 2 + th) % 10];
  const hourBranch = BRANCHES[th];
  const same = (x: readonly string[], y: readonly string[]) => x.length === y.length && x.every((s, k) => s === y[k]);
  if (h.monthly.heavenlyStem !== monthStem || !same(h.monthly.mutagen, STEM_MUTAGENS[monthStem]))
    fail("月干與流月四化", `${tag} 古訣 ${monthStem} iztro ${h.monthly.heavenlyStem}`);
  if (h.daily.heavenlyStem !== day.stem || h.daily.earthlyBranch !== day.branch || !same(h.daily.mutagen, STEM_MUTAGENS[day.stem]))
    fail("日干與流日四化", `${tag} 古訣 ${day.stem}${day.branch} iztro ${h.daily.heavenlyStem}${h.daily.earthlyBranch}`);
  if (h.hourly.heavenlyStem !== hourStem || h.hourly.earthlyBranch !== hourBranch || !same(h.hourly.mutagen, STEM_MUTAGENS[hourStem]))
    fail("時干與流時四化", `${tag} 古訣 ${hourStem}${hourBranch} iztro ${h.hourly.heavenlyStem}${h.hourly.earthlyBranch}`);

  // 流曜
  const checkStars = (key: string, stars: { name: string }[][], stem: string, branch: string) => {
    const want = expectedStars(stem, branch);
    const got: Record<string, number> = {};
    stars.forEach((list, idx) => list.forEach((s) => (got[s.name.slice(-1)] = idx)));
    for (const [suffix, idx] of Object.entries(want))
      if (got[suffix] !== idx) fail(key, `${tag} ${suffix}：古訣宮 ${idx}，iztro ${got[suffix] ?? "無"}`);
  };
  checkStars("流日流曜", h.daily.stars ?? [], day.stem, day.branch);
  checkStars("流月流曜", h.monthly.stars ?? [], monthStem, monthBranch);
  checkStars("流時流曜", h.hourly.stars ?? [], hourStem, hourBranch);
}

console.log(`驗算 ${checked} 組「命盤 × 任意日期時辰」`);
let ok = true;
for (const k of keys) {
  const list = fails[k];
  if (list.length === 0) console.log(`✓ ${k.padEnd(8, "　")} 全部相符`);
  else {
    ok = false;
    console.log(`✗ ${k} 不符 ${list.length} 筆\n  ${list.filter(Boolean).join("\n  ")}`);
  }
}

// 擇日是否因人而異：同一天起算、同一目的，不同命盤推薦的日子應該不同
const from = new Date(2026, 10, 12);
const people = [
  ["1985-3-21", 2, "男"], ["1985-3-21", 2, "女"], ["1985-3-21", 8, "男"], ["1992-11-2", 5, "女"], ["1970-7-15", 11, "男"], ["2001-1-28", 0, "女"],
] as const;
const picks = people.map(([d, t, g]) => {
  const a = astro.withOptions({ type: "solar", dateStr: d, timeIndex: t, gender: g, fixLeap: true, language: "zh-TW", config: CFG });
  return { who: `${d} ${BRANCHES[t]}時 ${g}`, best: pickDays(a, "deal", 30, from).best.map((x) => x.date) };
});
console.log("\n擇日（簽約・談生意，2026/11/12 起 30 天）各人推薦的日子：");
for (const p of picks) console.log(`  ${p.who}：${p.best.join("、")}`);
// 性別只決定大限順逆，流月、流日、流時與擇日用到的宮位四化都和性別無關，所以前兩人名單必須相同；其餘各人應互不相同
const genderSame = picks[0].best.join() === picks[1].best.join();
const others = picks.slice(1).map((p) => p.best.join());
const distinct = new Set(others).size === others.length;
console.log(genderSame ? "✓ 同生辰不同性別的擇日名單相同（性別只影響大限，流日不變）" : "✗ 同生辰不同性別的名單不同，流日不該受性別影響");
console.log(distinct ? "✓ 不同生辰（含同日不同時辰）的推薦名單互不相同" : "✗ 不同生辰的名單有重複");
if (!genderSame || !distinct) ok = false;
if (!ok) process.exit(1);
