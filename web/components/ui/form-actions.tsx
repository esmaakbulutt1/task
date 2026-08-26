"use client";

import { useTranslations } from "next-intl";

import Button from "@/components/ui/button";

type FormActionsProps = {
  submitLabel: string;
  loading?: boolean;
  loadingText?: string;
  cancelLabel?: string;
  onCancel?: () => void;
};

export default function FormActions({
  submitLabel,
  loading = false,
  loadingText,
  cancelLabel,
  onCancel,
}: FormActionsProps) {
  const t = useTranslations("Common");

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      {onCancel && (
        <Button
          type="button"
          variant="secondary"
          fullWidth={false}
          disabled={loading}
          onClick={onCancel}
        >
          {cancelLabel ?? t("cancel")}
        </Button>
      )}
      <Button
        type="submit"
        loading={loading}
        loadingText={loadingText}
        fullWidth={false}
      >
        {submitLabel}
      </Button>
    </div>
  );
}
