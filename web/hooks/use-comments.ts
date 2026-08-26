"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { requireAccessToken } from "@/lib/client-session";
import { getErrorMessage } from "@/lib/errors";
import { showToast } from "@/components/ui/toast";
import {
  createComment,
  deleteComment,
  getComments,
  updateComment,
} from "@/services/comment.service";
import type { Comment } from "@/types/comment.types";

export function useComments(taskId: string) {
  const t = useTranslations("Feedback.comments");
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadComments = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      setComments(await getComments(taskId, requireAccessToken()));
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, t("loadFailed")));
    } finally {
      setLoading(false);
    }
  }, [t, taskId]);

  useEffect(() => {
    let cancelled = false;

    void getComments(taskId, requireAccessToken())
      .then((response) => {
        if (!cancelled) {
          setComments(response);
          setError(null);
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(getErrorMessage(requestError, t("loadFailed")));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t, taskId]);

  async function addComment(content: string): Promise<boolean> {
    setActionId("create");
    setError(null);

    try {
      const created = await createComment(
        taskId,
        { content: content.trim() },
        requireAccessToken(),
      );
      setComments((current) => [...current, created]);
      showToast(t("addSuccess"), "success");
      return true;
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, t("addFailed")));
      return false;
    } finally {
      setActionId(null);
    }
  }

  async function editComment(
    commentId: string,
    content: string,
  ): Promise<boolean> {
    setActionId(commentId);
    setError(null);

    try {
      const updated = await updateComment(
        commentId,
        { content: content.trim() },
        requireAccessToken(),
      );
      setComments((current) =>
        current.map((comment) =>
          comment.id === commentId ? updated : comment,
        ),
      );
      showToast(t("updateSuccess"), "success");
      return true;
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, t("updateFailed")));
      return false;
    } finally {
      setActionId(null);
    }
  }

  async function removeComment(commentId: string): Promise<boolean> {
    setActionId(commentId);
    setError(null);

    try {
      await deleteComment(commentId, requireAccessToken());
      setComments((current) =>
        current.filter((comment) => comment.id !== commentId),
      );
      showToast(t("deleteSuccess"), "success");
      return true;
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, t("deleteFailed")));
      return false;
    } finally {
      setActionId(null);
    }
  }

  return {
    comments,
    loading,
    actionId,
    error,
    addComment,
    editComment,
    removeComment,
    loadComments,
    clearError: () => setError(null),
  };
}
