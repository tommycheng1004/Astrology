"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { SavedBirth } from "@/components/BirthForm";
import ActionSheet from "@/components/ActionSheet";
import { rememberDeepReport } from "@/components/DeepReportNotice";
import { accountServerSnapshot, accountSnapshot, closeAccountDialog, openAccountDialog, subscribeAccount } from "@/lib/account";
import { ANNUAL_REPORT, type ReportKind } from "@/lib/annualReport";
import { memberFetch } from "@/lib/memberFetch";
import { shareHash } from "@/lib/shareLink";
import { AI_ENABLED } from "@/lib/site";

export default function ReportLauncher({ saved, variant = "main", kind, children, className = "action-primary", disabled = false }: {
  saved: SavedBirth;
  variant?: "main" | "alt";
  kind: ReportKind;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot, accountServerSnapshot);
  const uid = account.user?.uid;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pendingLogin = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function openReport(aiConsent: boolean) {
    if (!uid || busy) return;
    dialogRef.current?.close();
    setBusy(true);
    setError("");
    try {
      const res = await memberFetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birth: shareHash(saved).slice(3), variant, kind, aiConsent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "無法開啟報告。");
      if (kind === "deep") rememberDeepReport(uid, data.id, data.status === "ready");
      router.push(`/report/${kind === "annual" ? ANNUAL_REPORT : kind}?record=${data.id}`);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function startAuthenticated() {
    if (AI_ENABLED) dialogRef.current?.showModal();
    else void openReport(false);
  }

  useEffect(() => {
    if (!uid || !pendingLogin.current) return;
    pendingLogin.current = false;
    closeAccountDialog();
    startAuthenticated();
    // 登入完成後接續同一份報告。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  function start() {
    if (!uid) {
      pendingLogin.current = true;
      openAccountDialog();
      return;
    }
    startAuthenticated();
  }

  return (
    <div>
      <button type="button" onClick={start} disabled={disabled || busy} className={className}>{busy ? "整理中…" : children}</button>
      {error && <p role="alert" className="mt-2 text-sm text-ji">{error}</p>}
      {AI_ENABLED && (
        <ActionSheet dialogRef={dialogRef} title={kind === "deep" ? "以 AI 深度解盤" : "報告要加入 AI 解讀嗎？"}>
          <p className="mb-4 text-sm leading-relaxed text-ink-soft">同意後，網站會把排盤結果提供給 AI 整理。傳送的資料不含姓名。</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => openReport(true)} className="action-primary">同意並繼續</button>
            {kind !== "deep" && <button type="button" onClick={() => openReport(false)} className="action-secondary">直接看規則報告</button>}
          </div>
        </ActionSheet>
      )}
    </div>
  );
}
