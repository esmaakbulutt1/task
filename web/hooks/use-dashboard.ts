"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { requireAccessToken } from "@/lib/client-session";
import { getErrorMessage } from "@/lib/errors";
import { getDashboardSummary } from "@/services/dashboard.service";
import type { DashboardSummary } from "@/types/dashboard.types";

function requestDashboardSummary(): Promise<DashboardSummary> {
  return getDashboardSummary(requireAccessToken());
}

export function useDashboard() {
  const t = useTranslations("Feedback.dashboard");
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadDashboard = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const summary = await requestDashboardSummary();
      setData(summary);
    } catch (error: unknown) {
      setData(null);
      setError(getErrorMessage(error, t("loadFailed")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve()
      .then(requestDashboardSummary)
      .then((summary) => {
        if (!cancelled) {
          setData(summary);
          setError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setData(null);
          setError(getErrorMessage(error, t("loadFailed")));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  return {
    data,
    loading,
    error,
    reloadDashboard,
  };
}
