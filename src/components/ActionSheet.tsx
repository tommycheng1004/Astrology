"use client";

import { useId, type ReactNode, type RefObject } from "react";

export default function ActionSheet({ dialogRef, onClose, title, children }: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  onClose?: () => void;
  title: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={id}
      onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}
      className="action-sheet max-h-[90dvh] w-full max-w-[30rem] overflow-y-auto overscroll-contain rounded-t-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/55 md:rounded-2xl"
    >
      <div className="px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6 md:pb-5">
        <div className="mb-2 flex min-h-11 items-center justify-between gap-3">
          <h2 id={id} className="font-serif text-xl font-bold">{title}</h2>
          <button type="button" onClick={() => dialogRef.current?.close()} aria-label="關閉" className="grid size-11 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-surface-2">
            <svg aria-hidden viewBox="0 0 16 16" className="size-4"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
