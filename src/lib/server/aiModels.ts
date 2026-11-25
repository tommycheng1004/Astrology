import "server-only";
import { ApiError, type GenerateContentParameters, type GenerateContentResponse, type GoogleGenAI } from "@google/genai";

/** 主要模型 */
export const PRIMARY_MODEL = process.env.AI_MODEL || "gemini-3.5-flash-lite";

/**
 * 備援模型：主要模型忙碌（503）、額度用完（429）或逾時，依序改用。
 * 免費方案的忙碌與額度都是「每個模型分開計算」，換模型通常就能成功，也等於多一份免費額度。
 * 預設值是 2026-11-25 用免費金鑰實測穩定的模型；AI_FALLBACK_MODELS 設為空字串可關閉備援。
 */
export const FALLBACK_MODELS = (process.env.AI_FALLBACK_MODELS ?? "gemini-3.6-flash,gemini-3.5-flash")
  .split(",")
  .map((model) => model.trim())
  .filter((model) => model && model !== PRIMARY_MODEL);

const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 5;
/** 剩下的時間少於這個數就不再嘗試，免得剛送出就被逾時中斷 */
const MIN_ATTEMPT_MS = 4_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function retryable(error: unknown) {
  if (error instanceof ApiError) return RETRYABLE.has(error.status);
  const name = (error as Error)?.name;
  return name === "AbortError" || name === "TimeoutError";
}

/**
 * 依序嘗試主要模型與備援模型（輪完一圈再從頭），直到成功、時間用完或遇到不可重試的錯誤。
 * - 400／401／403 這類設定錯誤不重試，直接丟出。
 * - deadline 是整體最晚結束的時間：Netlify 的伺服器函式最多跑 60 秒，要留時間給排盤與寫入資料庫。
 * - signal：使用者中途離開（例如關掉聊天）時停止。
 */
export async function generateWithFallback(
  ai: GoogleGenAI,
  params: Omit<GenerateContentParameters, "model">,
  { deadline, perAttempt, signal, label }: { deadline: number; perAttempt: number; signal?: AbortSignal; label: string },
): Promise<{ result: GenerateContentResponse; model: string }> {
  const models = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastError: unknown = new Error("AI deadline exceeded");
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // 換到下一個模型前稍等一下；輪回同一個模型時等久一點，讓忙碌高峰過去
    if (attempt > 0) await sleep(attempt < models.length ? 500 : 2_000);
    const remaining = deadline - Date.now();
    if (remaining < MIN_ATTEMPT_MS || signal?.aborted) break;
    const model = models[attempt % models.length];
    const timeout = AbortSignal.timeout(Math.min(perAttempt, remaining));
    try {
      const result = await ai.models.generateContent({
        ...params,
        model,
        config: { ...params.config, abortSignal: signal ? AbortSignal.any([signal, timeout]) : timeout },
      });
      if (attempt > 0) console.info(`[${label}] answered by fallback`, { model, attempt });
      return { result, model };
    } catch (error) {
      lastError = error;
      if (signal?.aborted || !retryable(error)) throw error;
      console.warn(`[${label}] model unavailable`, { model, status: error instanceof ApiError ? error.status : (error as Error).name });
    }
  }
  throw lastError;
}
