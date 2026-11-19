import assert from "node:assert/strict";
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
  "健康方面請諮詢專業人士。", "今年可以放慢腳步，留意工作節奏。",
];
for (const sentence of correct) assert.deepEqual(verifyAnswer(sentence, placements), { answer: sentence, errors: [] }, sentence);

const evidence = { placements, facts: [{ id: "F1", layer: "本命", text: "命宮有紫微" }] };
assert.equal(checkStructuredAnswer('{"answer":"紫微在命宮。","factIds":["F1"]}', evidence).errors.length, 0);
for (const ids of [[], ["F2"], ["F1", "F2"]]) {
  assert.equal(checkStructuredAnswer(JSON.stringify({ answer: "紫微在命宮。", factIds: ids }), evidence).validCitation, false);
}

console.log(`✓ ${wrong.length} 則錯誤及 ${correct.length} 則正確案例，另驗證引用編號`);
