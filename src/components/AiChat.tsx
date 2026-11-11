"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { accountServerSnapshot, accountSnapshot, currentIdToken, openAccountDialog, subscribeAccount } from "@/lib/account";
import type { Chart } from "@/lib/buildChart";
import { shareHash } from "@/lib/shareLink";

/**
 * AI 問答。命盤由伺服器依生辰重新排出後交給 AI；傳出去的只有出生日期、時間、性別與出生地，不含姓名。
 * 第一次使用前要先同意，同意紀錄存在使用者自己的瀏覽器。
 */

const CONSENT_KEY = "ziwei:ai-consent";
const MAX_QUESTION = 300;
const MAX_TURNS = 10;

const SUGGESTIONS = [
  "我適合什麼樣的工作？",
  "今年的運勢重點是什麼？",
  "我的感情要注意什麼？",
  "目前這個大限怎麼走？",
  "我的財運與理財建議",
  "身體健康要留意哪些地方？",
];

type Turn = { role: "user" | "assistant"; content: string };
/** 伺服器回報的今日題數 */
type QuotaInfo = { member: boolean; limit: number; remaining: number; memberLimit: number };

const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};
const readConsent = () => {
  try {
    return localStorage.getItem(CONSENT_KEY) === "1";
  } catch {
    return false;
  }
};

export default function AiChat({ chart }: { chart: Chart }) {
  const stored = useSyncExternalStore(subscribe, readConsent, () => false);
  const [agreed, setAgreed] = useState(false);
  const consent = stored || agreed;
  const [turns, setTurns] = useState<Turn[]>([]);
  /** 伺服器對目前對話的簽章，追問時要一起送回，竄改過的對話紀錄會被拒絕 */
  const [sig, setSig] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot, accountServerSnapshot);
  // 登入或登出後，之前的題數不再適用，等下一次回答再更新
  const [quotaUser, setQuotaUser] = useState(account.user?.uid ?? null);
  if ((account.user?.uid ?? null) !== quotaUser) {
    setQuotaUser(account.user?.uid ?? null);
    setQuota(null);
  }
  const abortRef = useRef<AbortController | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busy = answer !== null;
  const asked = turns.filter((t) => t.role === "user").length;
  const full = asked >= MAX_TURNS;

  useEffect(() => () => abortRef.current?.abort(), []);
  /*
   * 聊天視窗固定填滿螢幕（像聊天 App）：整頁不捲動，只有對話區捲動。
   * 桌機上方的分頁列要留著，所以先把它捲到固定位置，再從它下緣開始排；手機則從頂端排到底部分頁列上方。
   */
  const [top, setTop] = useState(0);
  useEffect(() => {
    if (!consent) return;
    const tabs = document.querySelector<HTMLElement>("[data-sticky-tabs]");
    const place = () => {
      const visible = tabs && getComputedStyle(tabs).display !== "none";
      // 不用 scrollIntoView：全站設了 scroll-padding-top，會停在分頁列下方 6.5rem
      if (visible) window.scrollTo(0, window.scrollY + tabs.getBoundingClientRect().top);
      setTop(visible ? Math.round(tabs.getBoundingClientRect().bottom) : 0);
    };
    place();
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = "hidden";
    window.addEventListener("resize", place);
    return () => {
      html.style.overflow = previous;
      window.removeEventListener("resize", place);
    };
  }, [consent]);

  // 新訊息出現或回答串流中時，對話跟著往下；使用者自己往上捲去看前面的內容時就不打擾
  const stickRef = useRef(true);
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTo({ top: el.scrollHeight, behavior: busy ? "auto" : "smooth" });
  }, [turns.length, answer, busy, error]);

  function agree() {
    try {
      localStorage.setItem(CONSENT_KEY, "1");
    } catch {
      // 存不了就只在這次有效
    }
    setAgreed(true);
  }

  async function ask(question: string) {
    const q = question.trim().slice(0, MAX_QUESTION);
    if (!q || busy || full) return;
    stickRef.current = true;
    const history: Turn[] = [...turns, { role: "user", content: q }];
    setTurns(history);
    setDraft("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setError(null);
    setAnswer("");
    const controller = new AbortController();
    abortRef.current = controller;
    let text = "";
    let failure: string | null = null;
    let stop: string | null = null;
    let nextSig: string | null = null;
    let nextQuota: QuotaInfo | null = null;
    try {
      const post = async (forceRefresh: boolean) => {
        // 登入的會員帶上登入憑證，伺服器以帳號計算每日題數
        const idToken = await currentIdToken(forceRefresh).catch(() => null);
        return fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
          body: JSON.stringify({ birth: shareHash(chart.saved).slice(3), variant: chart.variant, messages: history, sig }),
          signal: controller.signal,
        });
      };
      let res = await post(false);
      // 憑證剛好過期：換一張新的再試一次
      if (res.status === 401) res = await post(true);
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { error?: string; quota?: QuotaInfo } | null;
        failure = data?.error ?? "AI 暫時無法回答，請稍後再試。";
        if (data?.quota) nextQuota = data.quota;
      } else {
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line) continue;
            const event = JSON.parse(line) as { t?: string; done?: boolean; stop?: string; sig?: string; error?: string; quota?: QuotaInfo };
            if (event.t) {
              text += event.t;
              setAnswer(text);
            }
            if (event.error) failure = event.error;
            if (event.done) {
              stop = event.stop ?? null;
              nextSig = event.sig ?? null;
              if (event.quota) nextQuota = event.quota;
            }
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") failure = "連線中斷，請再試一次。";
    } finally {
      abortRef.current = null;
    }
    if (stop === "refusal") failure = "這個問題 AI 無法回答，換個問法試試看。";
    if (text && nextSig && stop !== "refusal") {
      setTurns([...history, { role: "assistant", content: text.trim() }]);
      setSig(nextSig);
    } else {
      // 沒有拿到回答：把問題放回輸入框，方便重問
      setTurns(turns);
      setDraft(q);
      requestAnimationFrame(() => inputRef.current && autosize(inputRef.current));
    }
    setAnswer(null);
    setError(failure);
    if (nextQuota) setQuota(nextQuota);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    ask(draft);
  }

  if (!consent) {
    return (
      <section aria-labelledby="ai-title" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h3 id="ai-title" className="font-serif text-2xl font-bold">
          問 AI 命理師
        </h3>
        <p className="mt-2 max-w-[40em] text-[15px] leading-relaxed text-ink-soft">
          AI 會根據你的命盤回答問題，例如工作方向、今年運勢、感情與財運。
        </p>
        <div className="mt-4 rounded-xl bg-surface-2/60 p-4 text-sm leading-relaxed text-ink-soft">
          <p className="font-medium text-ink">使用前請先了解</p>
          <ul className="mt-1 space-y-1">
            <li>・排盤本身仍在你的瀏覽器計算；不使用 AI 就不會傳出任何資料。</li>
            <li>・AI 的回答僅供參考，可能有錯，不構成醫療、法律或投資建議。</li>
            <li>・提問時請不要輸入姓名、電話、身分證字號等個人資料。</li>
          </ul>
          <p className="mt-2">
            詳見
            <Link href="/privacy" className="mx-1 font-medium text-accent underline underline-offset-4">
              隱私權政策
            </Link>
            。
          </p>
        </div>
        <button
          type="button"
          onClick={agree}
          className="mt-5 h-12 rounded-xl bg-accent px-6 font-serif font-bold tracking-[0.15em] text-surface transition hover:brightness-110"
        >
          同意並開始
        </button>
      </section>
    );
  }

  // 還沒問過的建議問題，回答後當作「接著問」的選項
  const asked_ = new Set(turns.filter((t) => t.role === "user").map((t) => t.content));
  const nextSuggestions = SUGGESTIONS.filter((x) => !asked_.has(x)).slice(0, turns.length ? 3 : 6);

  return (
    <>
      {/* 聊天視窗是固定定位、不佔頁面高度；留一個螢幕高的空間，桌機才捲得到讓分頁列貼齊頂端的位置 */}
      <div aria-hidden className="h-dvh" />
      <section
        ref={sectionRef}
        aria-labelledby="ai-title"
        style={{ top }}
        className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 bg-paper md:bottom-0"
      >
        <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-3 sm:px-6">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line py-3">
            <div className="flex items-center gap-3">
              <Avatar />
              <div>
                <h3 id="ai-title" className="font-serif text-lg font-bold leading-tight">
                  AI 命理老師
                </h3>
                <p className="text-xs text-muted">看過你的命盤，有問題直接問</p>
              </div>
            </div>
            {turns.length > 0 && !busy && (
              <button
                type="button"
                onClick={() => {
                  setTurns([]);
                  setSig(null);
                  setError(null);
                }}
                className="min-h-11 px-2 text-sm text-accent underline underline-offset-4"
              >
                新對話
              </button>
            )}
          </div>

          <div
            ref={scrollRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              stickRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 80;
            }}
            // 可捲動的區域要能用鍵盤捲（WCAG 2.1.1）
            role="region"
            aria-label="對話內容"
            tabIndex={0}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain focus-visible:outline-offset-[-2px]"
          >
            <p role="status" className="sr-only">
              {busy ? "AI 正在回答…" : turns.at(-1)?.role === "assistant" ? "AI 已回答" : ""}
            </p>
            <ol aria-label="對話" className="space-y-4 py-5">
              {/* 開場白只在畫面上，不送給模型 */}
              <Message turn={{ role: "assistant", content: "我已經看過你的命盤了。想先聊哪一塊？工作、感情、財運，或是今年的運勢都可以問我。" }} />
              {turns.map((t, i) => (
                <Message key={i} turn={t} />
              ))}
              {busy && (
                <li aria-busy="true">{answer ? <Message turn={{ role: "assistant", content: answer }} pending /> : <Typing />}</li>
              )}
            </ol>

            {error && (
              <div role="alert" className="mb-4 rounded-lg border border-ji/30 bg-ji/10 px-4 py-3 text-sm text-ji">
                <p>{error}</p>
                {quota && !quota.member && quota.remaining === 0 && account.enabled && (
                  <button
                    type="button"
                    onClick={openAccountDialog}
                    className="mt-2 h-11 rounded-lg bg-accent px-4 font-medium text-surface transition hover:brightness-110"
                  >
                    {account.user ? "完成 Email 驗證" : "登入或註冊會員"}
                  </button>
                )}
              </div>
            )}

            {!busy && !full && nextSuggestions.length > 0 && (
              <div className="mb-4 pl-12">
                <p className="mb-2 text-xs text-muted">{turns.length ? "也可以接著問" : "可以這樣問"}</p>
                <ul className="flex flex-wrap gap-2">
                  {nextSuggestions.map((x) => (
                    <li key={x}>
                      <button
                        type="button"
                        onClick={() => ask(x)}
                        className="min-h-11 rounded-full border border-accent/40 bg-surface px-4 text-[15px] text-accent transition hover:bg-accent-soft"
                      >
                        {x}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {full ? (
            <p className="shrink-0 border-t border-line py-4 text-sm text-muted">這段對話已經聊了 {MAX_TURNS} 題，按「新對話」可以重新開始。</p>
          ) : (
            <form onSubmit={onSubmit} className="shrink-0 pt-2 pb-2">
              <div className="flex items-end gap-2 rounded-3xl border border-line bg-surface p-1.5 pl-4 shadow-sm focus-within:border-accent">
                <label htmlFor="ai-question" className="sr-only">
                  輸入訊息
                </label>
                <textarea
                  id="ai-question"
                  ref={inputRef}
                  rows={1}
                  maxLength={MAX_QUESTION}
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    autosize(e.target);
                  }}
                  onKeyDown={(e) => {
                    // Enter 送出、Shift+Enter 換行；中文輸入法選字時不送出
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      ask(draft);
                    }
                  }}
                  placeholder={turns.length ? "接著聊…" : "輸入訊息，例如：我明年適合換工作嗎？"}
                  className="max-h-40 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-base leading-relaxed text-ink placeholder:text-muted focus:outline-none"
                />
                {busy ? (
                  <button
                    type="button"
                    onClick={() => abortRef.current?.abort()}
                    aria-label="停止回答"
                    className="grid size-11 shrink-0 place-items-center rounded-full border border-line text-ink-soft"
                  >
                    <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="currentColor">
                      <rect x="3" y="3" width="10" height="10" rx="1.5" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!draft.trim()}
                    aria-label="送出"
                    className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-surface transition hover:brightness-110 disabled:opacity-40"
                  >
                    <svg aria-hidden viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 16V4M5 9l5-5 5 5" />
                    </svg>
                  </button>
                )}
              </div>
              <p className="mt-1.5 px-4 text-xs leading-snug text-muted">
                {draft.length > MAX_QUESTION - 50 ? `${draft.length}/${MAX_QUESTION} 字・` : ""}
                {quota &&
                  `今天還可以問 ${quota.remaining} 題${
                    quota.member || !account.enabled ? "" : account.user ? `（驗證 Email 後每天 ${quota.memberLimit} 題）` : `（登入後每天 ${quota.memberLimit} 題）`
                  }・`}
                AI 回答僅供參考，可能有錯。
              </p>
            </form>
          )}
        </div>
      </section>
    </>
  );
}

/** 輸入框隨內容長高，最多約五行 */
function autosize(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
}

function Avatar() {
  return (
    <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-accent font-serif text-sm font-bold text-surface">
      紫
    </span>
  );
}

/** 等待第一個字出來前的「正在輸入」動畫 */
function Typing() {
  return (
    <div className="flex items-end gap-3">
      <Avatar />
      <div className="flex h-11 items-center gap-1.5 rounded-2xl rounded-bl-md border border-line bg-surface px-4">
        <span className="sr-only">AI 正在輸入</span>
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-2 animate-[typing_1.2s_ease-in-out_infinite] rounded-full bg-muted" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

function Message({ turn, pending = false }: { turn: Turn; pending?: boolean }) {
  const mine = turn.role === "user";
  const paragraphs = turn.content.split(/\n{2,}/);
  const Tag = pending ? "div" : "li";
  if (mine) {
    return (
      <Tag className="flex justify-end pl-12">
        <p className="rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap text-surface">{turn.content}</p>
      </Tag>
    );
  }
  return (
    <Tag className="flex items-end gap-3 pr-6 sm:pr-12">
      <Avatar />
      <div className="min-w-0 space-y-3 rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-3 text-[15px] leading-[1.8] text-ink">
        {paragraphs.map((p, i) => (
          <p key={i} className="whitespace-pre-wrap">
            {p}
          </p>
        ))}
      </div>
    </Tag>
  );
}
