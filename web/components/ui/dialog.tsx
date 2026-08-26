"use client";

import { useTranslations } from "next-intl";
import type { MouseEvent, ReactNode } from "react";
import { useEffect, useId, useRef } from "react";

type DialogSize = "sm" | "md" | "lg";

type DialogProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  size?: DialogSize;
  dismissible?: boolean;
  onClose: () => void;
};

const sizeClasses: Record<DialogSize, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
};

export default function Dialog({
  open,
  title,
  description,
  children,
  size = "md",
  dismissible = true,
  onClose,
}: DialogProps) {
  const t = useTranslations("Common");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>): void {
    if (dismissible && event.target === event.currentTarget) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (dismissible) onClose();
      }}
      onClick={handleBackdropClick}
      className={`m-auto w-[calc(100%-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50 ${sizeClasses[size]}`}
    >
      <div className="max-h-[calc(100svh-2rem)] overflow-y-auto">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-6 py-5">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-slate-950">
              {title}
            </h2>
            {description && (
              <p
                id={descriptionId}
                className="mt-1 text-sm leading-6 text-slate-500"
              >
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label={t("close")}
            title={t("close")}
            disabled={!dismissible}
            onClick={onClose}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ×
          </button>
        </header>
        <div className="p-6">{children}</div>
      </div>
    </dialog>
  );
}
