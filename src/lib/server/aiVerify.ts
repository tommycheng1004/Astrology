import type { CitedPlacement, Fact, Placement } from "@/lib/chartFacts";
import { MUTAGENS, STEM_MUTAGENS, type Mutagen } from "@/lib/chartExtras";
import { palaceTitle } from "@/lib/ziwei";

export type VerifiedAnswer = { answer: string; facts: Fact[]; filtered: boolean };

const palaceWords = "命|兄弟|夫妻|子女|財帛|疾厄|遷移|交友|僕役|奴僕|官祿|事業|田宅|福德|父母";
const palace = `(?:${palaceWords})宮`;
const palaceAliases: Record<string, string> = { 奴僕宮: "交友宮", 僕役宮: "交友宮", 事業宮: "官祿宮" };
const normalizePalace = (value: string) => palaceAliases[value] ?? palaceTitle(value.replace(/宮$/, ""));
const validChanges = Object.values(STEM_MUTAGENS);

export function verifyAnswer(answer: string, placements: Placement[], chartPositions = placements, citedFacts?: Fact[]) {
  const starNames = [...new Set([...chartPositions.map((p) => p.star), ...validChanges.flat(), "七殺"])].sort((a, b) => b.length - a.length);
  const star = `(?:${starNames.join("|")})`;
  const sentences = answer.match(/[^。！？\n]+[。！？]*|[。！？]+|\n+/g) ?? [];
  const errors: string[] = [];
  const kept = sentences.filter((sentence) => {
    const failures = new Set<string>();
    // 編號事實目前沒有星曜亮度。即使模型從摘要讀到，也不能當作已有引用的依據。
    if (citedFacts && new RegExp(`(?:${star})(?:星)?(?:[（(]\\s*|(?:亮度(?:為|是)?|入|落|坐))?[廟旺得利平陷閑閒](?:[）)]|地|勢|[，。；、]|$)`, "u").test(sentence)) {
      failures.add("引用未提供星曜亮度，請用白話說明已列出的盤面資料");
    }
    // 括號裡常是寫給初學者的註解，例如「官祿宮（看工作方式）有武曲」。
    const notes = /[（(]([^（）()]+)[）)]/gu;
    const claimText = sentence.replace(notes, "");
    const clauses = [claimText, ...Array.from(sentence.matchAll(notes), (m) => m[1])];
    for (const clause of clauses.flatMap((text) => text.split(/[；;，,]/))) {
      const layer = /童限|大限|流年|流月|生年|本命/.exec(clause)?.[0] ?? /童限|大限|流年|流月|生年|本命/.exec(sentence)?.[0];
      if (citedFacts) {
        const periodHouse = new RegExp(`(童限|大限|流年|流月)命宮(?:走到|落在|在|入)(?:本命)?(${palace})`, "gu");
        for (const [, period, house] of clause.matchAll(periodHouse)) {
          if (!citedFacts.some((f) => f.layer === period && f.text === `${period}命宮在本命${normalizePalace(house)}`))
            failures.add(`${period}命宮的位置沒有相符的引用`);
        }
        const emptyHouse = new RegExp(`(${palace})(?:是空宮|(?:沒有|無)主星)`, "gu");
        for (const [, house] of clause.matchAll(emptyHouse)) {
          if (!citedFacts.some((f) => f.layer === "借星" && f.palace === normalizePalace(house)))
            failures.add(`${house}無主星沒有相符的引用`);
        }
      }
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
      const palaceFirst = new RegExp(`(${palace})\\s*(借(?:到|入)?|的主星是|主星是|有|坐守|坐|見|是|由)?\\s*(${star}|[\\p{Script=Han}]{2}星)(?!\\s*(?:自化|化[祿權科忌]|太歲))`, "gu");
      for (const match of clause.matchAll(palaceFirst)) {
        const [, house, action, name] = match;
        const borrowed = !!action?.startsWith("借");
        placement(starNames.includes(name) ? name : name.replace(/星$/, ""), house, borrowed);
        const rest = clause.slice(match.index + match[0].length);
        const listed = new RegExp(`^(?:(?:、|和|與)(?:${star})(?:星)?)+`, "u").exec(rest);
        if (listed) for (const extra of listed[0].matchAll(new RegExp(star, "gu"))) placement(extra[0], house, borrowed);
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

type Evidence = { facts: Fact[]; placements: CitedPlacement[] };

export function checkStructuredAnswer(raw: string, evidence: Evidence, focus?: Fact[]) {
  let value: { answer?: unknown; factIds?: unknown } | null;
  try {
    value = JSON.parse(raw);
  } catch {
    value = null;
  }
  const ids = Array.isArray(value?.factIds) ? [...new Set(value.factIds)] : [];
  const facts = ids.flatMap((id) => evidence.facts.find((fact) => fact.id === id) ?? []);
  const draft = typeof value?.answer === "string" ? value.answer.trim() : "";
  const citedPositions = evidence.placements.filter((p) => ids.includes(p.factId));
  const result = verifyAnswer(draft, citedPositions, evidence.placements, facts);
  const errors = [...result.errors];
  if (!draft) errors.push("缺少回答文字");
  const validIds = ids.length > 0 && facts.length === ids.length;
  if (!validIds) errors.push("必須附上這張盤有效的事實編號");
  const inFocus = !focus || focus.some((f) => f.id === facts[0]?.id);
  if (!inFocus) errors.push("第一條依據應直接對應本題指定的宮位或運限");

  // 刪除錯句後重查。單有編號，正文卻只剩通用建議時，不能當成已核對的解讀。
  const normalized = result.answer.replace(/事業宮/g, "官祿宮").replace(/僕役宮|奴僕宮/g, "交友宮");
  const sentences = normalized.split(/[。！？\n]/u);
  const supports = (fact: Fact) => sentences.some((line) => {
    if (line.includes(fact.text)) return true;
    if (!line.includes(fact.palace)) return false;
    if (fact.layer === "借星" && /無主星|沒有主星|空宮/.test(line)) return true;
    if (fact.text.startsWith(`${fact.layer}命宮在本命`)) return line.includes(fact.layer);
    return citedPositions.some((p) => p.factId === fact.id && line.includes(p.palace) && line.includes(p.star)
      && (!p.change || line.includes(`化${p.change}`)));
  });
  const grounded = facts.length > 0 && facts.every(supports);
  if (validIds && !grounded) errors.push("請在一句話中寫出引用的宮位與星曜或運限，只附上正文確實用到的依據");
  return {
    result: { answer: result.answer, facts, filtered: result.errors.length > 0 } satisfies VerifiedAnswer,
    errors,
    validCitation: validIds && grounded && inFocus,
  };
}
