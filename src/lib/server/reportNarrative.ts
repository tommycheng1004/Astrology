import "server-only";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { ReportData } from "@/lib/annualReport";

export async function reportNarrative(report: ReportData) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (process.env.NEXT_PUBLIC_AI_ENABLED !== "1" || !apiKey) return null;
  const ai = new GoogleGenAI({ apiKey, httpOptions: process.env.GEMINI_BASE_URL ? { baseUrl: process.env.GEMINI_BASE_URL } : undefined });
  const result = await ai.models.generateContent({
    model: report.kind === "deep" ? (process.env.AI_DEEP_MODEL || process.env.AI_MODEL || "gemini-3.5-flash-lite") : process.env.AI_MODEL || "gemini-3.5-flash-lite",
    contents: JSON.stringify(report.facts),
    config: {
      systemInstruction: "用台灣繁體中文把輸入的紫微斗數資料改寫成易讀的報告。每段只依輸入事實，保留歲次、月份與評分等資料原意。不可自行推算星曜或日期。用純文字分段。語氣平實，不恐嚇、不預言疾病、死亡或離婚、不推銷開運物品。提到健康、投資或法律，每段都加上「請諮詢專業人士」。",
      maxOutputTokens: 2600,
      thinkingConfig: { thinkingLevel: report.kind === "deep" ? ThinkingLevel.MEDIUM : ThinkingLevel.LOW },
      abortSignal: AbortSignal.timeout(25_000),
    },
  });
  const narrative = result.text?.trim();
  if (!narrative) throw new Error("Empty report narrative");
  return narrative;
}
