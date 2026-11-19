import type { Fact, Placement } from "@/lib/chartFacts";
import { MUTAGENS, STEM_MUTAGENS, type Mutagen } from "@/lib/chartExtras";
import { palaceTitle } from "@/lib/ziwei";

export type VerifiedAnswer = { answer: string; facts: Fact[]; filtered: boolean };

const palaceWords = "命|兄弟|夫妻|子女|財帛|疾厄|遷移|交友|僕役|奴僕|官祿|事業|田宅|福德|父母";
const palace = `(?:${palaceWords})宮`;
const normalizePalace = (value: string) => value === "奴僕宮" || value === "僕役宮" ? "交友宮" : palaceTitle(value.replace(/宮$/, ""));
const validChanges = Object.values(STEM_MUTAGENS);

export function verifyAnswer(answer: string, placements: Placement[]) {
  const starNames = [...new Set([...placements.map((p) => p.star), ...validChanges.flat(), "七殺"])].sort((a, b) => b.length - a.length);
  const star = `(?:${starNames.join("|")})`;
  const sentences = answer.match(/[^。！？\n]+[。！？]*|[。！？]+|\n+/g) ?? [];
  const errors: string[] = [];
  const kept = sentences.filter((sentence) => {
    const failures = new Set<string>();
    for (const clause of sentence.split(/[；;，,]/)) {
      const layer = /大限|流年|流月|生年|本命/.exec(clause)?.[0] ?? /大限|流年|流月|生年|本命/.exec(sentence)?.[0];
      const transformations = new RegExp(`(${star}|[\\p{Script=Han}]{2})(?:星)?\\s*(自化|化)\\s*([祿權科忌])(?:\\s*(?:飛?入|落(?:在)?|在)\\s*(?:本命)?(${palace}))?`, "gu");
      for (const match of clause.matchAll(transformations)) {
        const [, name, action, change, destination] = match;
        const origin = new RegExp(`(${palace})\\s*(飛(?:出)?|的)?\\s*$`, "u").exec(clause.slice(0, match.index));
        const requested = action === "自化" ? "自化" : origin?.[2]?.startsWith("飛") || /宮干|飛化/.test(clause) ? "宮干飛化" : layer === "本命" ? "生年" : layer || "生年";
        const target = destination ? normalizePalace(destination) : origin && requested !== "宮干飛化" ? normalizePalace(origin[1]) : undefined;
        const from = origin && requested === "宮干飛化" ? normalizePalace(origin[1]) : undefined;
        const index = MUTAGENS.indexOf(change as Mutagen);
        if (!validChanges.some((row) => row[index] === name) || !placements.some((p) =>
          p.star === name && p.change === change && p.layer === requested && (!target || p.palace === target) && (!from || p.from === from),
        )) failures.add(`${requested}${name}化${change}${destination ? `入${destination}` : ""}與命盤不符`);
      }

      const placement = (name: string, house: string, borrowed: boolean) => {
        if (!placements.some((p) => p.layer === (borrowed ? "借星" : "本命") && p.star === name && p.palace === normalizePalace(house))) {
          failures.add(`${name}與${house}的位置不符`);
        }
      };
      const starFirst = new RegExp(`(${star}|[\\p{Script=Han}]{2}星)(?:星)?\\s*(?:坐守|坐鎮|坐|入|落在|位於|在)\\s*(?:本命)?(${palace})`, "gu");
      for (const [, name, house] of clause.matchAll(starFirst)) placement(starNames.includes(name) ? name : name.replace(/星$/, ""), house, false);
      const palaceFirst = new RegExp(`(${palace})\\s*(借(?:到|入)?|有|坐守|坐|見|是|由)?\\s*(${star}|[\\p{Script=Han}]{2}星)(?!\\s*(?:自化|化[祿權科忌]|太歲))`, "gu");
      for (const [, house, action, name] of clause.matchAll(palaceFirst)) {
        placement(starNames.includes(name) ? name : name.replace(/星$/, ""), house, !!action?.startsWith("借"));
      }
      const explicitUnknown = /(?:有|坐守|坐|位於)([\p{Script=Han}]{2,3})星(?:[。！？，；、]|$)/gu;
      for (const [, name] of clause.matchAll(explicitUnknown)) {
        if (!starNames.includes(name) && !starNames.includes(`${name}星`) && !/主|輔|煞|雜|吉|凶/.test(name)) failures.add(`命盤未見${name}星`);
      }
    }
    errors.push(...failures);
    return failures.size === 0;
  });
  return { answer: kept.join("").trim(), errors: [...new Set(errors)] };
}

export function checkStructuredAnswer(raw: string, evidence: { facts: Fact[]; placements: Placement[] }) {
  let value: { answer?: unknown; factIds?: unknown } | null;
  try {
    value = JSON.parse(raw);
  } catch {
    value = null;
  }
  const ids = Array.isArray(value?.factIds) ? [...new Set(value.factIds)] : [];
  const facts = evidence.facts.filter((fact) => ids.includes(fact.id));
  const draft = typeof value?.answer === "string" ? value.answer.trim() : "";
  const result = verifyAnswer(draft, evidence.placements);
  const errors = [...result.errors];
  if (!draft) errors.push("缺少回答文字");
  if (!ids.length || facts.length !== ids.length) errors.push("必須附上有效且實際使用的事實編號");
  return {
    result: { answer: result.answer, facts, filtered: result.errors.length > 0 } satisfies VerifiedAnswer,
    errors,
    validCitation: ids.length > 0 && facts.length === ids.length,
  };
}
