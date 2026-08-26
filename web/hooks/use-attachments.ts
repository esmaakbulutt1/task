"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { requireAccessToken } from "@/lib/client-session";
import { getErrorMessage } from "@/lib/errors";
import { showToast } from "@/components/ui/toast";
import {
  deleteAttachment,
  getAttachments,
  uploadAttachment,
} from "@/services/attachment.service";
import type { Attachment } from "@/types/attachment.types";

export function useAttachments(taskId: string) {
  const t = useTranslations("Feedback.attachments");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAttachments = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      setAttachments(await getAttachments(taskId, requireAccessToken()));
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, t("loadFailed")));
    } finally {
      setLoading(false);
    }
  }, [t, taskId]);

  useEffect(() => {
    let cancelled = false;

    void getAttachments(taskId, requireAccessToken())
      .then((response) => {
        if (!cancelled) {
          setAttachments(response);
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

  async function addAttachment(file: File): Promise<boolean> {
    setActionId("upload");
    setError(null);

    try {
      const created = await uploadAttachment(
        taskId,
        file,
        requireAccessToken(),
      );
      setAttachments((current) => [...current, created]);
      showToast(t("uploadSuccess"), "success");
      return true;
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, t("uploadFailed")));
      return false;
    } finally {
      setActionId(null);
    }
  }

  async function removeAttachment(attachmentId: string): Promise<boolean> {
    setActionId(attachmentId);
    setError(null);

    try {
      await deleteAttachment(attachmentId, requireAccessToken());
      setAttachments((current) =>
        current.filter((attachment) => attachment.id !== attachmentId),
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
    attachments,
    loading,
    actionId,
    error,
    addAttachment,
    removeAttachment,
    loadAttachments,
    clearError: () => setError(null),
  };
}
