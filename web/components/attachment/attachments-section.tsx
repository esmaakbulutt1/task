"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import Button from "@/components/ui/button";
import ConfirmPanel from "@/components/ui/confirm-panel";
import Dialog from "@/components/ui/dialog";
import FormMessage from "@/components/ui/form-message";
import Input from "@/components/ui/input";
import { useAttachments } from "@/hooks/use-attachments";
import type {
  WorkspaceMember,
  WorkspaceRole,
} from "@/types/workspace.types";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

type AttachmentsSectionProps = {
  taskId: string;
  members: WorkspaceMember[];
  workspaceRole: WorkspaceRole;
};

export default function AttachmentsSection({
  taskId,
  members,
  workspaceRole,
}: AttachmentsSectionProps) {
  const format = useFormatter();
  const t = useTranslations("Attachments");
  const common = useTranslations("Common");
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const {
    attachments,
    loading,
    actionId,
    error,
    addAttachment,
    removeAttachment,
    loadAttachments,
    clearError,
  } = useAttachments(taskId);
  const canDelete = workspaceRole === "owner" || workspaceRole === "admin";

  function formatFileSize(size: number): string {
    if (size < 1_024) return `${format.number(size)} B`;
    if (size < 1_048_576) {
      return `${format.number(size / 1_024, { maximumFractionDigits: 1 })} KB`;
    }
    return `${format.number(size / 1_048_576, { maximumFractionDigits: 1 })} MB`;
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
    setFieldError(undefined);
    clearError();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setFieldError(t("selectRequired"));
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setFieldError(t("invalidType"));
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFieldError(t("maxSize"));
      return;
    }

    if (await addAttachment(file)) {
      setFile(null);
      setInputKey((current) => current + 1);
      setShowUploadForm(false);
    }
  }

  function closeUploadForm(): void {
    setShowUploadForm(false);
    setFile(null);
    setFieldError(undefined);
    setInputKey((current) => current + 1);
    clearError();
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-slate-950">{t("title")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("description")}</p>
        </div>
        <Button
          type="button"
          size="sm"
          fullWidth={false}
          onClick={() => {
            clearError();
            setShowUploadForm(true);
          }}
        >
          {t("upload")}
        </Button>
      </div>

      {showUploadForm && (
        <Dialog
          open={showUploadForm}
          title={t("upload")}
          description={t("description")}
          size="sm"
          dismissible={actionId !== "upload"}
          onClose={closeUploadForm}
        >
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <Input
              key={inputKey}
              type="file"
              label={t("fileLabel")}
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              error={fieldError}
              disabled={actionId === "upload"}
              onChange={handleFileChange}
            />

            {error && <FormMessage variant="error">{error}</FormMessage>}

            <div className="flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                fullWidth={false}
                disabled={actionId === "upload"}
                onClick={closeUploadForm}
              >
                {common("cancel")}
              </Button>
              <Button
                type="submit"
                fullWidth={false}
                loading={actionId === "upload"}
                loadingText={t("uploading")}
              >
                {t("upload")}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {error && !showUploadForm && (
        <div className="mt-4 space-y-3">
          <FormMessage variant="error">{error}</FormMessage>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            fullWidth={false}
            onClick={() => {
              clearError();
              void loadAttachments();
            }}
          >
            {common("retry")}
          </Button>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">{t("loading")}</p>
        ) : attachments.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            {t("empty")}
          </p>
        ) : (
          attachments.map((attachment) => (
            <article
              key={attachment.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {attachment.originalName}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatFileSize(attachment.size)} ·{" "}
                    {members.find(
                      (member) => member.userId === attachment.uploadedBy,
                    )?.email ?? common("user")}{" "}
                    · {format.dateTime(new Date(attachment.createdAt), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                {canDelete && deleteId !== attachment.id && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    fullWidth={false}
                    onClick={() => setDeleteId(attachment.id)}
                  >
                    {common("delete")}
                  </Button>
                )}
              </div>
              {deleteId === attachment.id && (
                <div className="mt-4">
                  <ConfirmPanel
                    title={t("deleteTitle")}
                    description={t("deleteDescription")}
                    confirmLabel={t("confirmDelete")}
                    loading={actionId === attachment.id}
                    loadingText={common("deleting")}
                    onConfirm={() => {
                      void removeAttachment(attachment.id).then((removed) => {
                        if (removed) setDeleteId(null);
                      });
                    }}
                    onCancel={() => setDeleteId(null)}
                  />
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
