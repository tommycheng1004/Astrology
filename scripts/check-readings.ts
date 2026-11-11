// 命理解讀的一致性檢查（不是準確率驗證，而是確保規則照定義執行、文字沒有缺漏或自相矛盾）
// 執行：npx tsx scripts/check-readings.ts（可用 N=500 指定張數）
import { astro } from "iztro";
import { mutagenInPalace, PALACES, starInPalace } from "../src/content/palaces";
import { MUTAGENS } from "../src/content/sihua";
import { STARS } from "../src/content/stars";
import { pickDays, PURPOSES } from "../src/lib/dateSelect";
import { ALL_ASPECTS, analyzeLayer, analyzeNatal, GRADES } from "../src/lib/fortune";
import { readOtherPalace } from "../src/lib/palaceReadings";
import { analyzePatterns } from "../src/lib/patterns";
import { horoscopeAt, LEVELS, monthsOf, daysOf } from "../src/lib/periods";
import { bodyPalaceText, soulPersona } from "../src/lib/personality";
import { analyzeSynastry, RELATIONS } from "../src/lib/synastry";
import { careerFit, peachBlossom, wealthType } from "../src/lib/traits";
import type { Astrolabe } from "../src/lib/ziwei";

const problems: Record<string, string[]> = {};
const report = (key: string, detail: string) => (problems[key] ??= []).push(detail);

/** 遞迴掃描輸出：字串不得含 undefined/NaN/null/[object，數字不得是 NaN/Infinity */
function scan(value: unknown, where: string, depth = 0) {
  if (depth > 6 || value == null) return;
  if (typeof value === "string") {
    if (/undefined|NaN|null|\[object/.test(value)) report("文字含程式殘值", `${where}: ${value.slice(0, 60)}`);
  } else if (typeof value === "number") {
    if (!Number.isFinite(value)) report("數值異常", where);
  } else if (Array.isArray(value)) value.forEach((v, i) => scan(v, `${where}[${i}]`, depth + 1));
  else if (typeof value === "object") for (const [k, v] of Object.entries(value)) if (typeof v !== "function") scan(v, `${where}.${k}`, depth + 1);
}

// 1. 靜態內容覆蓋：每顆主星在每個宮位、每種四化在每個宮位都要有文字
for (const p of PALACES) {
  for (const s of STARS) if (!starInPalace(s.name, p.key)) report("主星×宮位缺文字", `${s.name}在${p.title}`);
  for (const m of MUTAGENS) if (!mutagenInPalace(m, p.key)) report("四化×宮位缺文字", `${p.title}化${m}`);
}

// 2. 隨機命盤跑過所有解讀模組
let seed = 20261031;
const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
const N = Number(process.env.N ?? 400);
const grades = new Set<string>(GRADES.map((g) => g.label));
const patternCount: Record<string, number> = {};
const charts: Astrolabe[] = [];
const started = Date.now();

for (let i = 0; i < N; i++) {
  const y = 1900 + Math.floor(rnd() * 200), m = 1 + Math.floor(rnd() * 12);
  const d = 1 + Math.floor(rnd() * new Date(y, m, 0).getDate());
  const tag = `${y}-${m}-${d} h${i % 12}`;
  const a = astro.withOptions({ type: "solar", dateStr: `${y}-${m}-${d}`, timeIndex: i % 12, gender: rnd() > 0.5 ? "男" : "女", fixLeap: true, language: "zh-TW" });
  charts.push(a);
  try {
    const natal = analyzeNatal(a);
    scan(natal, `${tag} 五運`);
    for (const r of natal) {
      if (r.score < 0 || r.score > 100) report("分數越界", `${tag} ${r.label} ${r.score}`);
      if (!grades.has(r.level)) report("等級名稱錯誤", `${tag} ${r.label} ${r.level}`);
      if (!r.summary) report("缺總結", `${tag} ${r.label}`);
      // 亮度敘述要與實際星曜亮度相符
      const palace = a.palaces[r.palaceIndex];
      for (const ins of r.insights) {
        for (const s of palace.majorStars) {
          if (ins.text.startsWith(s.name) && ins.text.includes("廟旺") && !["廟", "旺"].includes(s.brightness ?? "")) report("亮度敘述矛盾", `${tag} ${s.name}${s.brightness}：${ins.text}`);
          if (ins.text.startsWith(s.name) && ins.text.includes("落陷") && s.brightness !== "陷") report("亮度敘述矛盾", `${tag} ${s.name}${s.brightness}：${ins.text}`);
        }
      }
    }
    const patterns = analyzePatterns(a);
    scan(patterns, `${tag} 格局`);
    for (const p of patterns) patternCount[p.name] = (patternCount[p.name] ?? 0) + 1;
    const soul = a.palaces.find((p) => p.name === "命宮")!;
    const persona = soulPersona(a);
    if (!persona) report("命宮主星組合缺解讀", `${tag} ${soul.majorStars.map((s) => s.name).join("") || "（空宮）"}`);
    scan(persona, `${tag} 性格`);
    scan(bodyPalaceText(a), `${tag} 身宮`);
    for (const name of ["命宮", "兄弟", "子女", "田宅", "福德", "父母", "遷移"]) scan(readOtherPalace(a, name), `${tag} ${name}`);
    scan([peachBlossom(a), wealthType(a), careerFit(a)], `${tag} 特質`);

    // 運限：隨機日期的五層運勢
    const when = `${1950 + Math.floor(rnd() * 100)}-${1 + Math.floor(rnd() * 12)}-${1 + Math.floor(rnd() * 28)}`;
    const h = horoscopeAt(a, when, Math.floor(rnd() * 12));
    if (h)
      for (const level of LEVELS) {
        const layer = analyzeLayer(a, h, level, false, ALL_ASPECTS);
        scan(layer, `${tag} ${when} ${level}`);
        if (layer.length !== ALL_ASPECTS.length) report("執行錯誤", `${tag} ${level} 宮位數 ${layer.length}`);
        for (const r of layer) {
          if (r.score < 0 || r.score > 100) report("分數越界", `${tag} ${level} ${r.label} ${r.score}`);
          if (!r.summary || r.summary.includes("{p}")) report("缺總結", `${tag} ${level} ${r.label}`);
          if (r.insights.length < 2) report("缺總結", `${tag} ${level} ${r.label} 解讀少於兩條`);
        }
      }
  } catch (e) {
    report("執行錯誤", `${tag}: ${(e as Error).message}`);
  }
}

// 3. 合盤與擇日
for (let i = 0; i + 1 < Math.min(charts.length, 60); i += 2)
  for (const r of RELATIONS) {
    try { scan(analyzeSynastry(charts[i], charts[i + 1], r.id), `合盤 ${i} ${r.id}`); } catch (e) { report("執行錯誤", `合盤: ${(e as Error).message}`); }
  }
for (const p of PURPOSES) {
  for (const chart of charts.slice(0, 3)) {
    try {
      const picked = pickDays(chart, p.id, 30, new Date("2026-11-01"));
      scan(picked, `擇日 ${p.id}`);
      if (picked.best.length && picked.best.some((d) => d.bestHours.length !== 2)) report("執行錯誤", `擇日 ${p.id} 缺最佳時辰`);
      if (picked.best.some((d) => d.results.length !== p.keys.length)) report("執行錯誤", `擇日 ${p.id} 相關宮位數不符`);
    } catch (e) {
      report("執行錯誤", `擇日 ${p.id}: ${(e as Error).message}`);
    }
  }
}

// 4. 閏月三十天的年份，流月流日不能出錯（曾因換算套件問題拋錯）
for (const year of [1955, 2017, 2036, 2047, 2093]) {
  try {
    for (const entry of monthsOf(charts[0], year)) daysOf(year, entry);
  } catch (e) {
    report("流月流日錯誤", `${year}: ${(e as Error).message}`);
  }
}

console.log(`耗時 ${((Date.now() - started) / 1000).toFixed(1)} 秒，檢查 ${N} 張命盤`);
const keys = ["主星×宮位缺文字", "四化×宮位缺文字", "文字含程式殘值", "數值異常", "分數越界", "等級名稱錯誤", "缺總結", "亮度敘述矛盾", "命宮主星組合缺解讀", "流月流日錯誤", "執行錯誤"];
for (const k of keys) console.log(`${problems[k] ? "✗" : "✓"} ${k}${problems[k] ? `：${problems[k].length} 筆，例：${problems[k].slice(0, 2).join("；")}` : ""}`);
console.log("\n格局出現次數：", Object.entries(patternCount).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k} ${v}`).join("、"));
process.exit(Object.keys(problems).length ? 1 : 0);
