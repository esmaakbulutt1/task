"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { requireAccessToken } from "@/lib/client-session";
import { getErrorMessage } from "@/lib/errors";
import {
  deleteProject,
  getProject,
  updateProject,
} from "@/services/project.service";
import { getWorkspace } from "@/services/workspace.service";
import type {
  Project,
  UpdateProjectRequest,
} from "@/types/project.types";
import type { WorkspaceRole } from "@/types/workspace.types";

type ProjectData = {
  project: Project;
  workspaceRole: WorkspaceRole;
};

async function requestProjectData(projectId: string): Promise<ProjectData> {
  const accessToken = requireAccessToken();
  const project = await getProject(projectId, accessToken);
  const workspace = await getWorkspace(project.workspaceId, accessToken);

  return {
    project,
    workspaceRole: workspace.role,
  };
}

export function useProject(projectId: string) {
  const t = useTranslations("Feedback.project");
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [workspaceRole, setWorkspaceRole] = useState<WorkspaceRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const reloadProject = useCallback(async (): Promise<void> => {
    setLoading(true);
    setLoadError(null);

    try {
      const response = await requestProjectData(projectId);
      setProject(response.project);
      setWorkspaceRole(response.workspaceRole);
    } catch (error: unknown) {
      setProject(null);
      setWorkspaceRole(null);
      setLoadError(getErrorMessage(error, t("loadFailed")));
    } finally {
      setLoading(false);
    }
  }, [projectId, t]);

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve()
      .then(() => requestProjectData(projectId))
      .then((response) => {
        if (!cancelled) {
          setProject(response.project);
          setWorkspaceRole(response.workspaceRole);
          setLoadError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setProject(null);
          setWorkspaceRole(null);
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
  }, [projectId, t]);

  async function updateProjectItem(
    request: UpdateProjectRequest,
  ): Promise<boolean> {
    setActionLoading(true);
    setActionError(null);
    setSuccess(null);

    try {
      const updated = await updateProject(
        projectId,
        {
          ...(request.name !== undefined
            ? { name: request.name.trim() }
            : {}),
          ...(request.description !== undefined
            ? { description: request.description.trim() }
            : {}),
          ...(request.status !== undefined ? { status: request.status } : {}),
          ...(request.startDate !== undefined
            ? { startDate: request.startDate }
            : {}),
          ...(request.dueDate !== undefined ? { dueDate: request.dueDate } : {}),
        },
        requireAccessToken(),
      );

      setProject(updated);
      setSuccess(t("updateSuccess"));
      return true;
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, t("updateFailed")));
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteProjectItem(): Promise<boolean> {
    setActionLoading(true);
    setActionError(null);
    setSuccess(null);

    try {
      await deleteProject(projectId, requireAccessToken());
      const workspaceId = project?.workspaceId;
      router.replace(
        workspaceId
          ? `/workspaces/${workspaceId}/projects?deleted=1`
          : "/workspaces",
      );
      return true;
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, t("deleteFailed")));
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  function resetFeedback(): void {
    setActionError(null);
    setSuccess(null);
  }

  return {
    project,
    workspaceRole,
    loading,
    actionLoading,
    loadError,
    actionError,
    success,
    updateProjectItem,
    deleteProjectItem,
    reloadProject,
    resetFeedback,
  };
}
