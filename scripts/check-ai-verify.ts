import assert from "node:assert/strict";
import { AI_SUGGESTIONS, suggestionFacts } from "../src/lib/aiPrompt";
import { buildChart } from "../src/lib/buildChart";
import { chartTextWithFacts } from "../src/lib/chartText";
import { parseShareHash } from "../src/lib/shareLink";
import type { Placement } from "../src/lib/chartFacts";
import { checkStructuredAnswer, verifyAnswer } from "../src/lib/server/aiVerify";

const placements: Placement[] = [
  { layer: "本命", palace: "命宮", star: "紫微" },
  { layer: "本命", palace: "官祿宮", star: "武曲" },
  { layer: "本命", palace: "官祿宮", star: "天魁" },
  { layer: "本命", palace: "夫妻宮", star: "天同" },
  { layer: "本命", palace: "福德宮", star: "七殺" },
  { layer: "生年", palace: "官祿宮", star: "武曲", change: "祿" },
  { layer: "大限", palace: "命宮", star: "紫微", change: "科" },
  { layer: "流年", palace: "官祿宮", star: "武曲", change: "忌" },
  { layer: "流月", palace: "夫妻宮", star: "天同", change: "權" },
  { layer: "借星", palace: "遷移宮", star: "紫微", from: "命宮" },
  { layer: "宮干飛化", palace: "官祿宮", star: "武曲", change: "忌", from: "夫妻宮" },
  { layer: "自化", palace: "官祿宮", star: "武曲", change: "祿", from: "官祿宮" },
];

const wrong = [
  "紫微入疾厄宮。", "命宮有武曲。", "七殺化權。", "紫微化忌。",
  "大限紫微化科入夫妻宮。", "大限紫微化權入命宮。", "流年武曲化祿入官祿宮。",
  "流年武曲化忌入財帛宮。", "流月天同化權入命宮。", "流月武曲化忌。",
  "生年紫微化科。", "生年武曲化權入官祿宮。", "遷移宮坐紫微。", "疾厄宮借紫微。",
  "命宮飛武曲化忌入官祿宮。", "夫妻宮飛武曲化忌入命宮。", "官祿宮武曲自化權。",
  "財帛宮武曲自化祿。", "無極化科落命宮。", "官祿宮有虛皇星。", "紫帝星坐命宮。",
  "官祿宮有武曲、紫微。", "事業宮（看工作方式）有紫微。", "財帛宮的主星是武曲。", "工作容易上手（七殺化權）。",
  "七殺在官祿宮。", "夫妻宮有天魁。", "天同坐守福德宮。",
];
for (const sentence of wrong) {
  const checked = verifyAnswer(`先留意工作節奏。${sentence}`, placements);
  assert.ok(checked.errors.length, sentence);
  assert.equal(checked.answer, "先留意工作節奏。", sentence);
}
const correct = [
  "紫微在命宮。", "官祿宮有武曲，天魁也在官祿宮。", "遷移宮借紫微。",
  "生年武曲化祿入本命官祿宮。", "大限紫微化科入命宮。", "流年武曲化忌入官祿宮。",
  "流月天同化權入夫妻宮。", "夫妻宮飛武曲化忌入官祿宮。", "官祿宮武曲自化祿。",
  "事業宮（看工作方式）有武曲。", "官祿宮有武曲、天魁。",
  "健康方面請諮詢專業人士。", "今年可以放慢腳步，留意工作節奏。",
];
for (const sentence of correct) assert.deepEqual(verifyAnswer(sentence, placements), { answer: sentence, errors: [] }, sentence);

const evidence = {
  placements: [{ ...placements[0], factId: "F1" }, { ...placements[1], factId: "F2" }],
  facts: [{ id: "F1", layer: "本命", palace: "命宮", text: "命宮有紫微" }, { id: "F2", layer: "本命", palace: "官祿宮", text: "官祿宮有武曲" }],
};
assert.equal(checkStructuredAnswer('{"answer":"紫微在命宮。","factIds":["F1"]}', evidence).errors.length, 0);
for (const ids of [[], ["F2"], ["F1", "F2"], ["F99"]]) {
  assert.equal(checkStructuredAnswer(JSON.stringify({ answer: "紫微在命宮。", factIds: ids }), evidence).validCitation, false);
}

const generic = checkStructuredAnswer(JSON.stringify({ answer: "建議你先了解自己的興趣。", factIds: ["F1"] }), evidence);
assert.equal(generic.validCitation, false);
const wrongTopic = checkStructuredAnswer(JSON.stringify({ answer: "命宮有紫微。", factIds: ["F1"] }), evidence, [evidence.facts[1]]);
assert.equal(wrongTopic.validCitation, false);
const partial = checkStructuredAnswer(JSON.stringify({ answer: "事業宮（看工作方式）有武曲。命宮有紫微。", factIds: ["F2"] }), evidence);
assert.equal(partial.validCitation, true);
assert.equal(partial.result.answer, "事業宮（看工作方式）有武曲。");
console.log(`✓ ${wrong.length} 則錯誤及 ${correct.length} 則正確案例，另驗證引用編號`);

for (const answer of ["命宮有紫微（陷）。", "流年命宮在本命官祿宮。", "命宮無主星。"]) {
  assert.ok(checkStructuredAnswer(JSON.stringify({ answer, factIds: ["F1"] }), evidence).errors.length);
}

async function checkPersonalCharts() {
  const now = new Date("2026-11-24T04:00:00Z");
  const saved = parseShareHash("#c=1.f.s.1990.1.1.0.5.c.1055.taipei.0")!;
  for (const [variant, own, other] of [["main", "紫微", "太陽"], ["alt", "太陽", "紫微"]] as const) {
    const data = chartTextWithFacts(await buildChart(saved, variant, "share"), now);
    const focus = suggestionFacts(AI_SUGGESTIONS.career, data.facts)!;
    const basis = focus.find((f) => f.text === `官祿宮有${own}`)!;
    assert.ok(basis, variant);
    const check = (answer: string) => checkStructuredAnswer(JSON.stringify({ answer, factIds: [basis.id] }), data, focus);
    assert.equal(check(`你的官祿宮（看工作方式）有${own}。`).errors.length, 0);
    assert.equal(check(`你的官祿宮有${other}。`).validCitation, false);
  }
  console.log("✓ 同一生辰的兩個候選時辰，同一工作題各自引用正確命盤");
}
void checkPersonalCharts();
