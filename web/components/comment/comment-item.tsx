"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import CommentForm from "@/components/comment/comment-form";
import Button from "@/components/ui/button";
import ConfirmPanel from "@/components/ui/confirm-panel";
import type { Comment } from "@/types/comment.types";

type CommentItemProps = {
  comment: Comment;
  authorLabel: string;
  canEdit: boolean;
  canDelete: boolean;
  loading: boolean;
  onEdit: (content: string) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
};

export default function CommentItem({
  comment,
  authorLabel,
  canEdit,
  canDelete,
  loading,
  onEdit,
  onDelete,
}: CommentItemProps) {
  const format = useFormatter();
  const t = useTranslations("Comments");
  const common = useTranslations("Common");
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function handleEdit(content: string): Promise<boolean> {
    const updated = await onEdit(content);
    if (updated) setEditing(false);
    return updated;
  }

  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">{authorLabel}</p>
          <p className="mt-1 text-xs text-slate-500">
            {format.dateTime(new Date(comment.createdAt), {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            {comment.updatedAt !== comment.createdAt ? ` ${t("edited")}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && !editing && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              fullWidth={false}
              disabled={loading}
              onClick={() => setEditing(true)}
            >
              {common("edit")}
            </Button>
          )}
          {canDelete && !confirmingDelete && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              fullWidth={false}
              disabled={loading}
              onClick={() => setConfirmingDelete(true)}
            >
              {common("delete")}
            </Button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="mt-4">
          <CommentForm
            initialContent={comment.content}
            submitLabel={t("save")}
            loading={loading}
            onSubmit={handleEdit}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {comment.content}
        </p>
      )}

      {confirmingDelete && (
        <div className="mt-4">
          <ConfirmPanel
            title={t("deleteTitle")}
            description={t("deleteDescription")}
            confirmLabel={t("confirmDelete")}
            loading={loading}
            loadingText={common("deleting")}
            onConfirm={() => void onDelete()}
            onCancel={() => setConfirmingDelete(false)}
          />
        </div>
      )}
    </article>
  );
}
