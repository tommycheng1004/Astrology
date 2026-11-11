"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import {
  ACCOUNT_OPEN_EVENT,
  accountServerSnapshot,
  accountSnapshot,
  isInAppBrowser,
  loadAccount,
  refreshVerification,
  resendVerification,
  restoreAccount,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signOutAccount,
  signUpWithEmail,
  subscribeAccount,
  type AccountUser,
} from "@/lib/account";
import { AI_ENABLED } from "@/lib/site";

const noSubscribe = () => () => {};
const MIN_PASSWORD = 8;

type Mode = "signin" | "signup" | "reset";

/** 頁首的會員按鈕：沒登入顯示人像圖示，登入後顯示頭像；點開是登入／註冊／帳號視窗 */
export default function AccountButton() {
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot, accountServerSnapshot);
  const inApp = useSyncExternalStore(noSubscribe, isInAppBrowser, () => false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    restoreAccount();
    const open = () => openDialog();
    window.addEventListener(ACCOUNT_OPEN_EVENT, open);
    return () => window.removeEventListener(ACCOUNT_OPEN_EVENT, open);
  }, []);

  if (!account.enabled) return null;

  function openDialog() {
    setError(null);
    setNotice(null);
    setMode("signin");
    dialogRef.current?.showModal();
    // 焦點放在標題：螢幕閱讀器先唸出視窗名稱，也不會一打開就在關閉鈕上出現焦點框
    dialogRef.current?.querySelector<HTMLElement>("#account-title")?.focus();
    // 先載入 Firebase，按「用 Google 登入」時才能立刻開彈出視窗（否則會被瀏覽器擋下）
    loadAccount()
      .then(() => setEngineReady(true))
      .catch(() => setError("登入功能載入失敗，請確認網路後再試一次。"));
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  /** 執行一個帳號操作：期間按鈕停用，回傳錯誤說明就顯示 */
  async function run(action: () => Promise<string | null>, success?: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const message = await action().catch(() => "操作失敗，請稍後再試。");
    setBusy(false);
    if (message) setError(message);
    else if (success) setNotice(success);
    return !message;
  }

  const user = account.user;
  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        aria-haspopup="dialog"
        aria-label={user ? `會員：${user.name || user.email}` : "登入或註冊會員"}
        className="grid size-11 shrink-0 place-items-center rounded-full text-ink-soft transition hover:bg-surface-2 hover:text-accent"
      >
        {user ? (
          <Avatar user={user} size="size-8" />
        ) : (
          <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="8.5" r="3.75" />
            <path d="M4.75 19.5c1.2-3.4 4-5 7.25-5s6.05 1.6 7.25 5" strokeLinecap="round" />
          </svg>
        )}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="account-title"
        onClick={(e) => {
          // 點背景關閉
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="m-auto max-h-[92dvh] w-[min(100%-2rem,26rem)] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/45"
      >
        <div className="relative p-6">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="關閉"
            className="absolute top-2 right-2 grid size-11 place-items-center rounded-full text-ink-soft hover:bg-surface-2"
          >
            <svg aria-hidden viewBox="0 0 16 16" className="size-4">
              <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>

          {user ? (
            <SignedIn
              user={user}
              syncText={
                account.sync === "syncing"
                  ? "正在同步「我的命盤」…"
                  : account.sync === "error"
                    ? "命盤同步失敗，請重新整理頁面再試。"
                    : `「我的命盤」已同步到你的帳號（${account.syncedCount} 張），換裝置登入也看得到。`
              }
              busy={busy}
              message={
                error ? (
                  <p role="alert" className="mt-3 text-sm text-ji">
                    {error}
                  </p>
                ) : notice ? (
                  <p role="status" className="mt-3 rounded-lg bg-lu/10 px-3.5 py-2.5 text-sm text-lu">
                    {notice}
                  </p>
                ) : null
              }
              onResend={() => run(resendVerification, `已重新寄出驗證信到 ${user.email}。`)}
              onCheck={() =>
                run(async () => ((await refreshVerification()) ? null : "還沒有完成驗證，請先點驗證信裡的連結。"), "Email 已完成驗證。")
              }
              onSignOut={async () => {
                if (await run(async () => (await signOutAccount(), null))) dialogRef.current?.close();
              }}
            />
          ) : (
            <>
              <h2 id="account-title" tabIndex={-1} className="pr-10 font-serif text-xl font-bold focus:outline-none">
                {mode === "signup" ? "註冊會員" : mode === "reset" ? "重設密碼" : "登入會員"}
              </h2>
              {mode !== "reset" && (
                <ul className="mt-3 space-y-1.5 text-[15px] leading-relaxed text-ink-soft">
                  <li>・「我的命盤」同步到帳號，換手機、換瀏覽器都看得到</li>
                  {AI_ENABLED && <li>・問 AI 每天可以問更多題</li>}
                </ul>
              )}

              {mode !== "reset" &&
                (inApp ? (
                  <p className="mt-5 rounded-lg border border-gold/40 bg-gold/10 px-3.5 py-3 text-sm leading-relaxed text-ink-soft">
                    App 內建的瀏覽器（例如 LINE）無法使用 Google 登入，可以改用下方的 Email
                    {mode === "signup" ? "註冊" : "登入"}；或點右上角的選單，選「用預設瀏覽器開啟」。
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => run(signInWithGoogle)}
                    disabled={!engineReady || busy}
                    className="mt-5 flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-line-strong bg-surface text-[15px] font-medium text-ink transition hover:border-accent disabled:opacity-60"
                  >
                    <GoogleMark />
                    {engineReady ? "用 Google 帳號登入" : "載入中…"}
                  </button>
                ))}

              {mode !== "reset" && (
                <p className="my-4 flex items-center gap-3 text-sm text-muted">
                  <span aria-hidden className="h-px flex-1 bg-line" />或用 Email
                  <span aria-hidden className="h-px flex-1 bg-line" />
                </p>
              )}

              <EmailForm
                key={mode}
                mode={mode}
                disabled={!engineReady || busy}
                onSubmit={(name, email, password) =>
                  mode === "signup"
                    ? run(() => signUpWithEmail(name, email, password))
                    : mode === "signin"
                      ? run(() => signInWithEmail(email, password))
                      : run(() => sendPasswordReset(email), `如果 ${email} 有註冊過，重設密碼的信已經寄出，請到信箱查看（也看看垃圾郵件）。`)
                }
              />

              {error && (
                <p role="alert" className="mt-3 text-sm text-ji">
                  {error}
                </p>
              )}
              {notice && (
                <p role="status" className="mt-3 rounded-lg bg-lu/10 px-3.5 py-2.5 text-sm text-lu">
                  {notice}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 text-sm">
                {mode === "signin" && (
                  <>
                    <TextButton onClick={() => switchMode("reset")}>忘記密碼？</TextButton>
                    <span className="text-ink-soft">
                      還沒有帳號？<TextButton onClick={() => switchMode("signup")}>註冊</TextButton>
                    </span>
                  </>
                )}
                {mode === "signup" && (
                  <span className="text-ink-soft">
                    已經有帳號了？<TextButton onClick={() => switchMode("signin")}>登入</TextButton>
                  </span>
                )}
                {mode === "reset" && <TextButton onClick={() => switchMode("signin")}>← 回到登入</TextButton>}
              </div>

              <p className="mt-3 text-xs leading-relaxed text-muted">
                {mode === "signup" ? "註冊即表示你同意本站依" : "登入只會取得你的名稱、Email 與大頭貼，詳見"}
                <Link href="/privacy" onClick={() => dialogRef.current?.close()} className="mx-0.5 text-accent underline underline-offset-4">
                  隱私權政策
                </Link>
                {mode === "signup" ? "處理你的資料。" : "。"}
              </p>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}

function SignedIn({
  user,
  syncText,
  busy,
  message,
  onResend,
  onCheck,
  onSignOut,
}: {
  user: AccountUser;
  syncText: string;
  busy: boolean;
  /** 驗證、重寄等操作的結果 */
  message: ReactNode;
  onResend: () => void;
  onCheck: () => void;
  onSignOut: () => void;
}) {
  return (
    <>
      <h2 id="account-title" tabIndex={-1} className="pr-10 font-serif text-xl font-bold focus:outline-none">
        會員帳號
      </h2>
      <div className="mt-4 flex items-center gap-3">
        <Avatar user={user} size="size-12" />
        <div className="min-w-0">
          <p className="truncate font-medium">{user.name || "會員"}</p>
          <p className="truncate text-sm text-muted">{user.email}</p>
        </div>
      </div>

      {!user.verified && (
        <div className="mt-4 rounded-lg border border-gold/40 bg-gold/10 px-3.5 py-3 text-sm leading-relaxed text-ink-soft">
          <p>
            驗證信已寄到 <strong className="font-medium text-ink">{user.email}</strong>，點信中的連結完成驗證
            {AI_ENABLED ? "後，問 AI 才會有會員的每日題數" : ""}。沒收到請看看垃圾郵件。
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={onCheck} disabled={busy} className="h-11 rounded-lg bg-accent px-4 font-medium text-surface disabled:opacity-60">
              我已完成驗證
            </button>
            <button type="button" onClick={onResend} disabled={busy} className="h-11 rounded-lg border border-line bg-surface px-4 text-ink-soft disabled:opacity-60">
              重寄驗證信
            </button>
          </div>
        </div>
      )}
      {message}

      <p className="mt-4 rounded-lg bg-surface-2/60 px-3.5 py-2.5 text-sm text-ink-soft">{syncText}</p>
      <button
        type="button"
        onClick={onSignOut}
        disabled={busy}
        className="mt-5 h-11 w-full rounded-xl border border-line text-[15px] text-ink-soft transition hover:border-accent hover:text-accent disabled:opacity-60"
      >
        登出
      </button>
      <p className="mt-2 text-xs leading-relaxed text-muted">登出後，這台裝置上的命盤會清除；資料仍保存在你的帳號裡。</p>
    </>
  );
}

/** 登入、註冊、忘記密碼共用的 Email 表單 */
function EmailForm({
  mode,
  disabled,
  onSubmit,
}: {
  mode: Mode;
  disabled: boolean;
  onSubmit: (name: string, email: string, password: string) => void;
}) {
  const id = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (mode === "signup" && password.length < MIN_PASSWORD) {
      setProblem(`密碼至少要 ${MIN_PASSWORD} 個字元。`);
      return;
    }
    setProblem(null);
    onSubmit(name, email, password);
  }

  const input =
    "h-11 w-full rounded-lg border border-line bg-paper/60 px-3 text-base text-ink placeholder:text-muted focus:border-accent focus:bg-surface focus:outline-none";
  return (
    <form onSubmit={submit} className={`space-y-3 ${mode === "reset" ? "mt-4" : ""}`}>
      {mode === "reset" && <p className="text-[15px] leading-relaxed text-ink-soft">輸入註冊時的 Email，我們會寄一封重設密碼的信給你。</p>}
      {mode === "signup" && (
        <Field id={`${id}-name`} label="名稱" hint="選填">
          <input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} maxLength={20} autoComplete="nickname" className={input} />
        </Field>
      )}
      <Field id={`${id}-email`} label="Email">
        <input
          id={`${id}-email`}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete={mode === "signup" ? "email" : "username"}
          inputMode="email"
          className={input}
        />
      </Field>
      {mode !== "reset" && (
        <Field id={`${id}-password`} label="密碼" hint={mode === "signup" ? `至少 ${MIN_PASSWORD} 個字元` : undefined}>
          <div className="relative">
            <input
              id={`${id}-password`}
              type={show ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={mode === "signup" ? MIN_PASSWORD : undefined}
              aria-invalid={!!problem || undefined}
              aria-describedby={problem ? `${id}-problem` : undefined}
              className={`${input} pr-16`}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              aria-pressed={show}
              className="absolute top-0 right-0 h-11 px-3 text-sm text-accent"
            >
              {show ? "隱藏" : "顯示"}
            </button>
          </div>
        </Field>
      )}
      {problem && (
        <p id={`${id}-problem`} role="alert" className="text-sm text-ji">
          {problem}
        </p>
      )}
      <button
        type="submit"
        disabled={disabled}
        className="h-12 w-full rounded-xl bg-accent font-serif text-base font-bold tracking-[0.2em] text-surface transition hover:brightness-110 disabled:opacity-60"
      >
        {mode === "signup" ? "註冊" : mode === "reset" ? "寄出重設密碼信" : "登入"}
      </button>
    </form>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-ink-soft">
        {label}
        {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function TextButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-11 items-center text-accent underline underline-offset-4">
      {children}
    </button>
  );
}

function Avatar({ user, size }: { user: { name: string; email: string; photo: string | null }; size: string }) {
  const [broken, setBroken] = useState(false);
  if (user.photo && !broken)
    // eslint-disable-next-line @next/next/no-img-element -- Google 大頭貼，不經 Next 圖片最佳化
    return <img src={user.photo} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} className={`${size} rounded-full object-cover`} />;
  return (
    <span aria-hidden className={`${size} grid place-items-center rounded-full bg-accent font-serif text-sm font-bold text-surface`}>
      {(user.name || user.email || "會").slice(0, 1)}
    </span>
  );
}

/** Google 的「G」標誌（依 Google 登入按鈕的品牌規範使用） */
function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="size-5">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
