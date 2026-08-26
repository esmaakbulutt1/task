"use client";

import { useEffect, useState } from "react";

type ToastVariant = "success" | "error" | "info";
type ToastPayload = { message: string; variant: ToastVariant };
type ToastItem = ToastPayload & { id: number };

const TOAST_EVENT = "taskflow:toast";
let nextToastId = 1;

export function showToast(
  message: string,
  variant: ToastVariant = "info",
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ToastPayload>(TOAST_EVENT, {
      detail: { message, variant },
    }),
  );
}

const variantClasses: Record<ToastVariant, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
};

export default function ToastViewport() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const timers = new Set<number>();

    const handleToast = (event: Event): void => {
      const { detail } = event as CustomEvent<ToastPayload>;
      const id = nextToastId++;

      setToasts((current) => [...current.slice(-2), { id, ...detail }]);
      const timer = window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
        timers.delete(timer);
      }, 4_000);
      timers.add(timer);
    };

    window.addEventListener(TOAST_EVENT, handleToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, handleToast);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.variant === "error" ? "alert" : "status"}
          className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${variantClasses[toast.variant]}`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
