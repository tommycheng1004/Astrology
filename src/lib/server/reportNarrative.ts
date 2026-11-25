import "server-only";
import { FinishReason, GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { ReportData } from "@/lib/annualReport";
import { generateWithFallback } from "@/lib/server/aiModels";

const BASE_INSTRUCTION =
  "用台灣繁體中文把輸入的紫微斗數資料改寫成易讀的報告。每段第一句先用日常用語說重點，再指出本段所依據的一項盤面資料，首次出現宮位或運限術語時用短句解釋。生活例子要寫成假設。每段只依輸入事實，保留歲次、月份與評分等資料原意。不可自行推算星曜或日期。用純文字分段，段落標題用【】包起來，不要用 Markdown 符號。稱呼讀者用「你」。語氣平實，不恐嚇、不預言疾病、死亡或離婚、不推銷開運物品。只有內容談到健康、投資或法律的段落才加上「請諮詢專業人士」，其他段落不要加。";

/** 每種報告要寫的段落與長度。沒寫清楚時模型常只回一兩句（2026-11-25 實測流年報告只寫了 78 字） */
const STRUCTURE: Record<ReportData["kind"], string> = {
  annual:
    "這是一整年的流年報告，依序寫：【全年總覽】、【十項運勢】（每一項兩到三句，照輸入的順序）、【犯太歲與流年四化】、【十二個月】（每個月一到兩句，照輸入的順序）、【擇日提醒】（挑三到五種用途說明怎麼使用這些日子）。全文約 1,500 到 2,500 字。",
  monthly: "這是單月的流月報告，寫【本月重點】、【可以多花心力】、【需要留意】三段，全文約 300 到 600 字。",
  deep:
    "這是整張命盤的深度解說，依序寫：【整體個性】、【事業】、【財運】、【感情】、【健康】、【人際】、【目前的十年大運】、【今年】，每段三到五句。全文約 1,500 到 2,500 字。",
};

/** 截斷時去掉最後半句，避免報告停在句子中間 */
function trimToSentence(text: string) {
  const end = Math.max(text.lastIndexOf("。"), text.lastIndexOf("！"), text.lastIndexOf("？"));
  return end > text.length * 0.6 ? text.slice(0, end + 1) : text;
}

/**
 * 報告的 AI 白話整理。主要模型忙碌時自動重試並改用備援模型（見 aiModels.ts）。
 * 時間預算：Netlify 伺服器函式最多 60 秒，流年報告排盤計算在雲端約需 14 秒，所以 AI 最多用 38 秒。
 */
export async function reportNarrative(report: ReportData) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (process.env.NEXT_PUBLIC_AI_ENABLED !== "1" || !apiKey) return null;
  const ai = new GoogleGenAI({ apiKey, httpOptions: process.env.GEMINI_BASE_URL ? { baseUrl: process.env.GEMINI_BASE_URL } : undefined });
  const { result, model } = await generateWithFallback(
    ai,
    {
      contents: JSON.stringify(report.facts),
      config: {
        systemInstruction: `${BASE_INSTRUCTION}\n${STRUCTURE[report.kind]}`,
        // 上限包含模型的「思考」用量；原本 2,600 時深度解盤的思考就用掉 2,000 多，正文被截斷
        maxOutputTokens: 8_000,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    },
    { deadline: Date.now() + (report.kind === "annual" ? 38_000 : 45_000), perAttempt: 30_000, label: "reports" },
  );
  const narrative = result.text?.trim();
  if (!narrative) throw new Error("Empty report narrative");
  if (result.candidates?.[0]?.finishReason === FinishReason.MAX_TOKENS) {
    console.warn("[reports] narrative truncated", { model, kind: report.kind });
    return trimToSentence(narrative);
  }
  return narrative;
}
