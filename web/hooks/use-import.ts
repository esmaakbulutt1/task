"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { requireAccessToken } from "@/lib/client-session";
import { getErrorMessage } from "@/lib/errors";
import { showToast } from "@/components/ui/toast";
import {
  getImportFailedRows,
  getImportStatus,
  uploadTaskCsv,
} from "@/services/import.service";
import type {
  ImportFailedRowsResponse,
  ImportJobStatusResponse,
} from "@/types/import.types";

const TERMINAL_STATUSES = new Set(["completed", "failed"]);

export function useImport(projectId: string, initialJobId?: string) {
  const t = useTranslations("Feedback.import");
  const router = useRouter();
  const [jobId, setJobId] = useState(initialJobId ?? null);
  const [job, setJob] = useState<ImportJobStatusResponse | null>(null);
  const [failedRows, setFailedRows] = useState<ImportFailedRowsResponse | null>(
    null,
  );
  const [failedPage, setFailedPage] = useState(1);
  const [loading, setLoading] = useState(Boolean(initialJobId));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async (): Promise<void> => {
      try {
        const response = await getImportStatus(jobId, requireAccessToken());
        if (cancelled) return;

        setJob(response);
        setError(null);
        setLoading(false);

        if (!TERMINAL_STATUSES.has(response.status)) {
          timer = setTimeout(() => void poll(), 1_500);
        }
      } catch (requestError: unknown) {
        if (!cancelled) {
          setLoading(false);
          setError(
            getErrorMessage(requestError, t("statusLoadFailed")),
          );
        }
      }
    };

    void poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobId, t]);

  useEffect(() => {
    if (job?.status !== "completed" || job.failedRows === 0) return;

    let cancelled = false;

    void getImportFailedRows(job.id, failedPage, requireAccessToken())
      .then((response) => {
        if (!cancelled) setFailedRows(response);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(
            getErrorMessage(requestError, t("failedRowsLoadFailed")),
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [failedPage, job?.failedRows, job?.id, job?.status, t]);

  async function uploadCsv(file: File): Promise<boolean> {
    setUploading(true);
    setError(null);
    setFailedRows(null);
    setFailedPage(1);

    try {
      const created = await uploadTaskCsv(
        projectId,
        file,
        requireAccessToken(),
      );
      setJobId(created.id);
      setLoading(true);
      showToast(t("startSuccess"), "success");
      router.replace(
        `/projects/${encodeURIComponent(projectId)}/import?jobId=${encodeURIComponent(created.id)}`,
      );
      return true;
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, t("uploadFailed")));
      return false;
    } finally {
      setUploading(false);
    }
  }

  function startNewImport(): void {
    setJobId(null);
    setJob(null);
    setFailedRows(null);
    setFailedPage(1);
    setError(null);
    router.replace(`/projects/${encodeURIComponent(projectId)}/import`);
  }

  return {
    job,
    failedRows,
    loading,
    uploading,
    error,
    uploadCsv,
    startNewImport,
    changeFailedPage: setFailedPage,
  };
}
