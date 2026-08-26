"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { FormEvent } from "react";

import Button from "@/components/ui/button";
import Textarea from "@/components/ui/textarea";

type CommentFormProps = {
  initialContent?: string;
  submitLabel?: string;
  loading?: boolean;
  onSubmit: (content: string) => Promise<boolean>;
  onCancel?: () => void;
};

export default function CommentForm({
  initialContent = "",
  submitLabel,
  loading = false,
  onSubmit,
  onCancel,
}: CommentFormProps) {
  const t = useTranslations("Comments");
  const common = useTranslations("Common");
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedContent = content.trim();

    if (!normalizedContent) {
      setError(t("required"));
      return;
    }

    if (normalizedContent.length > 1_000) {
      setError(t("maxLength"));
      return;
    }

    if (await onSubmit(normalizedContent)) {
      setContent("");
      setError(undefined);
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit} noValidate>
      <Textarea
        label={initialContent ? t("editLabel") : t("newLabel")}
        value={content}
        maxLength={1_000}
        required
        disabled={loading}
        error={error}
        hint={common("characterCount", { count: content.length, max: 1000 })}
        placeholder={t("placeholder")}
        onChange={(event) => {
          setContent(event.target.value);
          setError(undefined);
        }}
      />
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          size="sm"
          fullWidth={false}
          loading={loading}
          loadingText={common("saving")}
        >
          {submitLabel ?? t("add")}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            fullWidth={false}
            disabled={loading}
            onClick={onCancel}
          >
            {common("cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}
