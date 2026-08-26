"use client";

import { useTranslations } from "next-intl";

import Button from "@/components/ui/button";

type ErrorStateProps = {
  title: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export default function ErrorState({
  title,
  message,
  onRetry,
  retryLabel,
}: ErrorStateProps) {
  const t = useTranslations("Common");

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <h1 className="font-semibold text-red-800">{title}</h1>
      <p className="mt-2 text-sm text-red-700">{message}</p>
      {onRetry && (
        <Button
          type="button"
          variant="outlineDanger"
          size="sm"
          fullWidth={false}
          className="mt-5"
          onClick={onRetry}
        >
          {retryLabel ?? t("retry")}
        </Button>
      )}
    </div>
  );
}
