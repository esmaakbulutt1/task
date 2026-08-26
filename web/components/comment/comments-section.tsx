"use client";

import { useTranslations } from "next-intl";

import CommentForm from "@/components/comment/comment-form";
import CommentItem from "@/components/comment/comment-item";
import Button from "@/components/ui/button";
import FormMessage from "@/components/ui/form-message";
import { useComments } from "@/hooks/use-comments";
import type {
  WorkspaceMember,
  WorkspaceRole,
} from "@/types/workspace.types";

type CommentsSectionProps = {
  taskId: string;
  members: WorkspaceMember[];
  currentUserId: string;
  workspaceRole: WorkspaceRole;
};

export default function CommentsSection({
  taskId,
  members,
  currentUserId,
  workspaceRole,
}: CommentsSectionProps) {
  const t = useTranslations("Comments");
  const common = useTranslations("Common");
  const {
    comments,
    loading,
    actionId,
    error,
    addComment,
    editComment,
    removeComment,
    loadComments,
    clearError,
  } = useComments(taskId);
  const canDelete = workspaceRole === "owner" || workspaceRole === "admin";

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-950">{t("title")}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {t("description")}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {t("count", { count: comments.length })}
        </span>
      </div>

      <CommentForm
        loading={actionId === "create"}
        onSubmit={addComment}
      />

      {error && (
        <div className="mt-4 space-y-3">
          <FormMessage variant="error">{error}</FormMessage>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            fullWidth={false}
            onClick={() => {
              clearError();
              void loadComments();
            }}
          >
            {common("retry")}
          </Button>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">{t("loading")}</p>
        ) : comments.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            {t("empty")}
          </p>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              authorLabel={
                members.find((member) => member.userId === comment.userId)
                  ?.email ?? common("user")
              }
              canEdit={comment.userId === currentUserId}
              canDelete={canDelete}
              loading={actionId === comment.id}
              onEdit={(content) => editComment(comment.id, content)}
              onDelete={() => removeComment(comment.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}
