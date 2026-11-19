"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import ActionSheet from "@/components/ActionSheet";
import { accountServerSnapshot, accountSnapshot, openAccountDialog, subscribeAccount } from "@/lib/account";
import type { Chart } from "@/lib/buildChart";
import { chartText } from "@/lib/chartText";
import { personalityHighlight } from "@/lib/chartHighlights";
import { lineShareHref, shareUrl } from "@/lib/shareLink";

const item = "flex min-h-11 items-center rounded-lg px-2 text-left text-[15px] font-medium text-ink hover:bg-surface-2 disabled:opacity-60";

export default function ChartShare({ chart }: { chart: Chart }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot, accountServerSnapshot);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(false);
  const [image, setImage] = useState<{ file: File; url: string; alt: string } | null>(null);
  const personality = personalityHighlight(chart.astrolabe);
  useEffect(() => () => { if (image) URL.revokeObjectURL(image.url); }, [image]);

  function open() {
    setActive(true);
    setStatus("");
    setImage(null);
    dialogRef.current?.showModal();
  }

  async function shareLink() {
    setStatus("");
    const url = shareUrl(chart.saved);
    try {
      if (navigator.share) await navigator.share({ title: "我的紫微命盤", url });
      else {
        await navigator.clipboard.writeText(url);
        setStatus("已複製分享連結");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") setStatus("無法分享連結，請確認瀏覽器的剪貼簿權限。");
    }
  }

  async function copyText() {
    setStatus("");
    if (!account.user) {
      dialogRef.current?.close();
      openAccountDialog();
      return;
    }
    try {
      await navigator.clipboard.writeText(chartText(chart));
      setStatus("已複製 AI 文字盤");
    } catch {
      setStatus("無法複製，請確認瀏覽器的剪貼簿權限。");
    }
  }

  async function makeImage(kind: "persona" | "chart") {
    setBusy(true);
    setStatus("");
    try {
      const { renderChartImage, renderPersonalityImage } = await import("@/lib/chartImage");
      const isPersona = kind === "persona" && personality;
      const blob = isPersona
        ? await renderPersonalityImage(personality)
        : await renderChartImage(chart.astrolabe, chart.input.name, chart.rulesText);
      const alt = isPersona ? "命盤個性卡預覽" : "完整命盤圖片預覽";
      const file = new File([blob], isPersona ? "紫微命盤個性卡.png" : "紫微命盤.png", { type: "image/png" });
      if (dialogRef.current?.open) setImage({ file, url: URL.createObjectURL(file), alt });
    } catch {
      setStatus("圖片產生失敗，請再試一次。");
    } finally {
      setBusy(false);
    }
  }

  async function shareImage(file: File) {
    try {
      await navigator.share({ files: [file] });
    } catch (error) {
      if ((error as Error).name !== "AbortError") setStatus("請使用下載圖片，或長按圖片儲存。");
    }
  }

  return (
    <>
      <button type="button" onClick={open} aria-haspopup="dialog" className="action-text">
        <svg aria-hidden viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3m-4 4 4-4 4 4M7 10H5v11h14V10h-2" /></svg>
        分享
      </button>
      <ActionSheet dialogRef={dialogRef} title={image ? image.alt : "分享命盤"} onClose={() => { setActive(false); setImage(null); }}>
        {image ? (
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- 瀏覽器產生的圖片預覽 */}
            <img src={image.url} alt={image.alt} className="mx-auto max-h-[54dvh] w-auto rounded-lg object-contain" />
            <div className="flex flex-wrap gap-2">
              <a href={image.url} download={image.file.name} className="action-primary">下載圖片</a>
              {navigator.canShare?.({ files: [image.file] }) && <button type="button" onClick={() => shareImage(image.file)} className="action-secondary">分享圖片</button>}
              <button type="button" onClick={() => { setImage(null); setStatus(""); }} className="action-text">返回分享選單</button>
            </div>
          </div>
        ) : (
          <div className="grid gap-1">
            {personality && <button type="button" onClick={() => makeImage("persona")} disabled={busy} className="action-primary w-full">{busy ? "製作圖片中…" : "製作命盤個性卡"}</button>}
            <button type="button" onClick={shareLink} className={item}>分享命盤連結</button>
            {active && <a href={lineShareHref(chart.saved)} target="_blank" rel="noopener noreferrer" className={item}>傳到 LINE</a>}
            <button type="button" onClick={() => makeImage("chart")} disabled={busy} className={item}>存成完整命盤圖片</button>
            {account.enabled && <button type="button" onClick={copyText} className={item}>複製 AI 文字盤</button>}
            <p className="mt-1 text-xs text-ink-soft">個性卡只含個性摘要。命盤連結含生辰，請分享給信任的人。</p>
          </div>
        )}
        <p role="status" className="mt-2 text-sm text-ink-soft empty:hidden">{status}</p>
      </ActionSheet>
    </>
  );
}
