"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { requireAccessToken } from "@/lib/client-session";
import { getErrorMessage } from "@/lib/errors";
import {
  createWorkspace,
  getWorkspaces,
} from "@/services/workspace.service";
import type {
  CreateWorkspaceRequest,
  Workspace,
} from "@/types/workspace.types";

function requestWorkspaces(): Promise<Workspace[]> {
  return getWorkspaces(requireAccessToken());
}

export function useWorkspaces() {
  const t = useTranslations("Feedback.workspaces");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const reloadWorkspaces = useCallback(async (): Promise<void> => {
    setLoading(true);
    setLoadError(null);

    try {
      setWorkspaces(await requestWorkspaces());
    } catch (error: unknown) {
      setWorkspaces([]);
      setLoadError(getErrorMessage(error, t("loadFailed")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve()
      .then(requestWorkspaces)
      .then((response) => {
        if (!cancelled) {
          setWorkspaces(response);
          setLoadError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setWorkspaces([]);
          setLoadError(getErrorMessage(error, t("loadFailed")));
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

  async function createWorkspaceItem(
    request: CreateWorkspaceRequest,
  ): Promise<boolean> {
    setActionLoading(true);
    setActionError(null);

    try {
      const description = request.description?.trim();
      const workspace = await createWorkspace(
        {
          name: request.name.trim(),
          ...(description ? { description } : {}),
        },
        requireAccessToken(),
      );

      setWorkspaces((current) => [
        workspace,
        ...current.filter((item) => item.id !== workspace.id),
      ]);
      return true;
    } catch (error: unknown) {
      setActionError(
        getErrorMessage(error, t("createFailed")),
      );
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  function resetError(): void {
    setActionError(null);
  }

  return {
    workspaces,
    loading,
    actionLoading,
    loadError,
    actionError,
    createWorkspaceItem,
    reloadWorkspaces,
    resetError,
  };
}
