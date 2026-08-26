"use client";

import { useTranslations } from "next-intl";

import Button from "@/components/ui/button";
import Dialog from "@/components/ui/dialog";

type ConfirmPanelProps = {
  title: string;
  description: string;
  confirmLabel: string;
  loading?: boolean;
  loadingText?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmPanel({
  title,
  description,
  confirmLabel,
  loading = false,
  loadingText,
  onConfirm,
  onCancel,
}: ConfirmPanelProps) {
  const t = useTranslations("Common");

  return (
    <Dialog
      open
      title={title}
      description={description}
      size="sm"
      dismissible={!loading}
      onClose={onCancel}
    >
      <div className="flex flex-wrap justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          fullWidth={false}
          disabled={loading}
          onClick={onCancel}
        >
          {t("cancel")}
        </Button>
        <Button
          type="button"
          variant="outlineDanger"
          fullWidth={false}
          loading={loading}
          loadingText={loadingText}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
