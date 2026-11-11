import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { ApiError, FinishReason, GoogleGenAI, ThinkingLevel } from "@google/genai";
import { AI_SYSTEM_PROMPT } from "@/lib/aiPrompt";
import { buildChart } from "@/lib/buildChart";
import { chartSummary } from "@/lib/chartSummary";
import { authConfigured, DAILY_LIMIT, refundQuestion, takeQuestion, usageConfigured, verifyIdToken, type Quota } from "@/lib/server/firebase";
import { parseShareHash } from "@/lib/shareLink";

/**
 * AI 問答：POST { birth, variant, messages, sig } → 以換行分隔的 JSON 串流
 *   {"t":"文字片段"} … {"done":true,"stop":"end_turn","sig":"…"}，出錯時 {"error":"訊息"}
 *
 * 安全設計：
 * - 預設關閉，NEXT_PUBLIC_AI_ENABLED=1 才啟用（前端分頁也依同一個變數顯示）。
 * - 不接受前端傳來的命盤文字：只收生辰代碼（與分享連結同格式、不含姓名），由伺服器重新排盤，
 *   避免有人塞入任意內容，把這裡當成免費的通用聊天機器人。
 * - 防提示詞注入：對話紀錄由瀏覽器保存並送回，有心人可以偽造一段「AI 已經答應改當通用助理」的回答。
 *   所以每次回答完，伺服器對整段對話（生辰＋所有問答）簽章；下一題送回時驗章，只有最後一個新問題是未經簽章的內容。
 *   使用者的問題一律包在標記裡交給模型，系統提示也明確規定問題內容不是指令。
 * - 模型沒有任何工具、看不到其他人的資料，最壞情況只是答非所問；再加上長度與輪數限制，濫用的成本有上限。
 * - 限制對話輪數、問題長度與回答長度；每個 IP 有簡易頻率限制（存在單一實例的記憶體，只擋短時間連發）。
 * - 每日題數記在 Firestore（usage/）：登入會員以 uid、訪客以 IP 雜湊計算，先扣再答，沒得到回答就退回。
 *   沒設定 Firebase 服務帳戶時不限每日題數，只剩上面的頻率限制。
 */

/** 預設 Gemini 3.5 Flash-Lite（穩定版、價格低）；要更好的品質可改 gemini-3.8-flash */
const MODEL = process.env.AI_MODEL || "gemini-3.5-flash-lite";
const MAX_TURNS = 10;
const MAX_QUESTION = 300;
const MAX_ANSWER = 12000;
const MAX_BODY = 64 * 1024;
const RATE_LIMIT = { max: 15, windowMs: 10 * 60 * 1000 };

const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
  if (recent.length >= RATE_LIMIT.max) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return false;
}

/** Gemini 每日額度重置時間（美西時間午夜）換算成台灣的整點，夏令時間期間是 15 點、其餘是 16 點 */
function quotaResetHour(now = new Date()) {
  const pacificOffset = (tz: string) => {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric" })
        .formatToParts(now)
        .map((x) => [x.type, x.value]),
    );
    return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour) - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours())) / 3600e3;
  };
  return (24 + 8 - pacificOffset("America/Los_Angeles")) % 24;
}

/** 對話簽章的金鑰：有設 AI_HISTORY_SECRET 就用它，否則由 Gemini 金鑰衍生（各伺服器實例一致，金鑰換掉時舊對話自然失效） */
function historySecret() {
  return process.env.AI_HISTORY_SECRET || createHash("sha256").update(`ziwei-ai-history:${process.env.GEMINI_API_KEY}`).digest("hex");
}

function signHistory(birth: string, variant: string, turns: Turn[]) {
  return createHmac("sha256", historySecret()).update(JSON.stringify([birth, variant, turns])).digest("base64url");
}

function validSignature(sig: unknown, expected: string) {
  if (typeof sig !== "string") return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** 移除控制字元並去頭尾空白；簽章與驗章都用整理後的內容，兩邊才會一致 */
const clean = (text: string) => text.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim();

/** 使用者的問題包在標記裡，讓模型清楚分辨「問題內容」與「指示」；問題裡的同名標記先移除，避免提早結束 */
const wrapQuestion = (q: string) => `<question>\n${q.replace(/<\/?question>/gi, "")}\n</question>`;

const fail = (status: number, error: string) => Response.json({ error }, { status });

type Turn = { role: "user" | "assistant"; content: string };

function parseTurns(value: unknown): Turn[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_TURNS * 2 - 1) return null;
  const turns: Turn[] = [];
  for (const [i, item] of value.entries()) {
    const role = i % 2 === 0 ? "user" : "assistant";
    const content = typeof item?.content === "string" ? clean(item.content) : "";
    if (item?.role !== role || !content || content.length > (role === "user" ? MAX_QUESTION : MAX_ANSWER)) return null;
    turns.push({ role, content });
  }
  return turns[turns.length - 1].role === "user" ? turns : null;
}

export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_AI_ENABLED !== "1") return new Response("Not Found", { status: 404 });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fail(503, "AI 尚未設定，請稍後再試。");

  const ip = request.headers.get("x-nf-client-connection-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (rateLimited(ip)) return fail(429, "提問太頻繁了，請過幾分鐘再試。");

  // 有帶登入憑證就必須有效；過期時請前端重新取得，不默默當成訪客。
  // Email 還沒驗證的帳號以訪客計算，避免大量註冊假帳號來換題數
  const bearer = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  let uid: string | null = null;
  let unverified = false;
  if (bearer && authConfigured) {
    const who = await verifyIdToken(bearer);
    if (!who) return fail(401, "登入已過期，請重新登入後再問。");
    if (who.verified) uid = who.uid;
    else unverified = true;
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY) return fail(413, "內容太長。");
  let body: { birth?: unknown; variant?: unknown; messages?: unknown; sig?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(400, "格式錯誤。");
  }
  const saved = typeof body.birth === "string" ? parseShareHash(`#c=${body.birth}`) : null;
  const turns = parseTurns(body.messages);
  if (!saved) return fail(400, "生辰資料有誤。");
  if (!turns) return fail(400, `問題請在 ${MAX_QUESTION} 字以內，一段對話最多 ${MAX_TURNS} 題。`);
  const birth = body.birth as string;
  const variant = body.variant === "alt" ? "alt" : "main";
  // 追問時，之前的問答必須和伺服器簽過的一字不差
  if (turns.length > 1 && !validSignature(body.sig, signHistory(birth, variant, turns.slice(0, -1))))
    return fail(400, "對話紀錄無法驗證，請按「重新開始」。");

  let summary: string;
  try {
    const chart = await buildChart(saved, variant, "share");
    summary = chartSummary(chart.astrolabe);
  } catch {
    return fail(400, "無法排出命盤，請確認生辰資料。");
  }

  // 每日題數：內容都檢查過才扣，格式錯誤的請求不算一題
  let quota: Quota | null = null;
  if (usageConfigured) {
    try {
      const taken = await takeQuestion(uid ? { uid } : { ip }, historySecret());
      quota = taken.quota;
      if (!taken.allowed)
        return Response.json(
          {
            error: quota.member
              ? `今天的 ${quota.limit} 題已經問完了，明天（台灣時間 0 點）再來。`
              : unverified
                ? `今天的 ${quota.limit} 題免費提問已經用完。完成 Email 驗證後，每天可以問 ${DAILY_LIMIT.member} 題。`
                : `今天的 ${quota.limit} 題免費提問已經用完。登入會員每天可以問 ${DAILY_LIMIT.member} 題。`,
            quota: { member: quota.member, limit: quota.limit, remaining: 0, memberLimit: DAILY_LIMIT.member },
          },
          { status: 429 },
        );
    } catch (error) {
      // 用量資料庫出問題時不擋使用者，只記錄下來
      console.error("[ask] 用量紀錄失敗", error);
    }
  }
  const quotaInfo = quota
    ? { member: quota.member, limit: quota.limit, remaining: Math.max(0, quota.limit - quota.used), memberLimit: DAILY_LIMIT.member }
    : undefined;

  // GEMINI_BASE_URL 只給本機測試指向模擬伺服器用，正式環境不要設定
  const ai = new GoogleGenAI({ apiKey, httpOptions: process.env.GEMINI_BASE_URL ? { baseUrl: process.env.GEMINI_BASE_URL } : undefined });
  const abort = new AbortController();
  request.signal.addEventListener("abort", () => abort.abort());
  const encoder = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController, data: object) => controller.enqueue(encoder.encode(`${JSON.stringify(data)}\n`));

  return new Response(
    new ReadableStream({
      async start(controller) {
        let answered = false;
        try {
          let answer = "";
          let finish: string | undefined;
          let usage: { promptTokenCount?: number; cachedContentTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number } | undefined;
          // Gemini 偶爾會回空白的 MALFORMED_RESPONSE（SDK 的列舉裡還沒有這個值）；還沒輸出任何文字時自動重試一次
          for (let attempt = 0; attempt < 2; attempt++) {
            finish = undefined;
            const stream = await ai.models.generateContentStream({
              model: MODEL,
              contents: turns.map((t) => ({
                role: t.role === "assistant" ? "model" : "user",
                parts: [{ text: t.role === "user" ? wrapQuestion(t.content) : t.content }],
              })),
              config: {
                // 共用指示在前、命盤資料在後：Gemini 會自動快取相同的開頭（implicit caching），同一段對話的追問較省
                systemInstruction: `${AI_SYSTEM_PROMPT}\n\n命盤資料：\n${summary}`,
                maxOutputTokens: 3000,
                // 一般問答不需要深度推理，思考程度低一點回答較快也較省（思考 token 以輸出價格計費）
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
                abortSignal: abort.signal,
              },
            });
            for await (const chunk of stream) {
              const text = chunk.text;
              if (text) {
                answer += text;
                send(controller, { t: text });
              }
              finish = chunk.candidates?.[0]?.finishReason ?? finish;
              usage = chunk.usageMetadata ?? usage;
            }
            if (answer || finish !== "MALFORMED_RESPONSE") break;
            console.warn("[ask] MALFORMED_RESPONSE，重試一次");
          }
          console.info(
            `[ask] ${MODEL} in=${usage?.promptTokenCount ?? 0} cached=${usage?.cachedContentTokenCount ?? 0} out=${usage?.candidatesTokenCount ?? 0} thoughts=${usage?.thoughtsTokenCount ?? 0} finish=${finish}`,
          );
          const stop =
            finish === FinishReason.MAX_TOKENS
              ? "max_tokens"
              : finish && finish !== FinishReason.STOP
                ? "refusal" // SAFETY、PROHIBITED_CONTENT 等被擋下的情況
                : "end_turn";
          if (stop === "max_tokens") {
            // 截斷說明也由伺服器加上，前端照收，簽章才對得起來
            const note = "……（回答太長，已截斷）";
            answer += note;
            send(controller, { t: note });
          }
          const reply = clean(answer);
          answered = stop !== "refusal" && !!reply;
          send(controller, {
            done: true,
            stop,
            quota: answered ? quotaInfo : undefined,
            // 被擋下或沒有內容的回答不會留在對話裡，不需要簽章
            sig: stop !== "refusal" && reply ? signHistory(birth, variant, [...turns, { role: "assistant", content: reply }]) : undefined,
          });
        } catch (error) {
          if (!abort.signal.aborted) {
            console.error("[ask]", error);
            const status = error instanceof ApiError ? error.status : 0;
            // 免費方案的每日額度（錯誤內容含 PerDay）在美西時間午夜重置
            const daily = status === 429 && /PerDay/i.test(String((error as Error).message));
            send(controller, {
              error:
                daily
                  ? `今天的 AI 提問次數已經用完，台灣時間 ${quotaResetHour()} 點後恢復。`
                  : status === 429
                  ? "目前提問的人太多，請過一分鐘再試。"
                  : status === 400 || status === 401 || status === 403
                    ? "AI 設定有誤，請稍後再試。"
                    : "AI 暫時無法回答，請稍後再試。",
            });
          }
        } finally {
          // 沒有得到回答（出錯、被擋下、中途取消）就把這一題退回
          if (!answered && quota) await refundQuestion(quota.key).catch((e) => console.error("[ask] 退回題數失敗", e));
          controller.close();
        }
      },
    }),
    { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } },
  );
}
