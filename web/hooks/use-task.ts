"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { requireAccessToken } from "@/lib/client-session";
import { getErrorMessage } from "@/lib/errors";
import { getProfile } from "@/services/auth.service";
import { getProject } from "@/services/project.service";
import {
  deleteTask,
  getTask,
  updateTask,
} from "@/services/task.service";
import {
  getWorkspace,
  getWorkspaceMembers,
} from "@/services/workspace.service";
import type { Project } from "@/types/project.types";
import type { Task, UpdateTaskRequest } from "@/types/task.types";
import type {
  WorkspaceMember,
  WorkspaceRole,
} from "@/types/workspace.types";

type TaskData = {
  task: Task;
  project: Project;
  workspaceRole: WorkspaceRole;
  members: WorkspaceMember[];
  currentUserId: string;
};

async function requestTaskData(taskId: string): Promise<TaskData> {
  const accessToken = requireAccessToken();
  const task = await getTask(taskId, accessToken);
  const project = await getProject(task.projectId, accessToken);
  const [workspace, members, profile] = await Promise.all([
    getWorkspace(project.workspaceId, accessToken),
    getWorkspaceMembers(project.workspaceId, accessToken),
    getProfile(accessToken),
  ]);

  return {
    task,
    project,
    workspaceRole: workspace.role,
    members,
    currentUserId: profile.id,
  };
}

export function useTask(taskId: string) {
  const t = useTranslations("Feedback.task");
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [workspaceRole, setWorkspaceRole] = useState<WorkspaceRole | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const applyData = useCallback((data: TaskData): void => {
    setTask(data.task);
    setProject(data.project);
    setWorkspaceRole(data.workspaceRole);
    setMembers(data.members);
    setCurrentUserId(data.currentUserId);
  }, []);

  const reloadTask = useCallback(async (): Promise<void> => {
    setLoading(true);
    setLoadError(null);

    try {
      applyData(await requestTaskData(taskId));
    } catch (error: unknown) {
      setTask(null);
      setProject(null);
      setWorkspaceRole(null);
      setMembers([]);
      setCurrentUserId(null);
      setLoadError(getErrorMessage(error, t("loadFailed")));
    } finally {
      setLoading(false);
    }
  }, [applyData, t, taskId]);

  useEffect(() => {
    let cancelled = false;

    void requestTaskData(taskId)
      .then((data) => {
        if (!cancelled) {
          applyData(data);
          setLoadError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setTask(null);
          setProject(null);
          setWorkspaceRole(null);
          setMembers([]);
          setCurrentUserId(null);
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
  }, [applyData, t, taskId]);

  async function updateTaskItem(
    request: UpdateTaskRequest,
  ): Promise<boolean> {
    setActionLoading(true);
    setActionError(null);
    setSuccess(null);

    try {
      const updated = await updateTask(
        taskId,
        {
          ...(request.title !== undefined
            ? { title: request.title.trim() }
            : {}),
          ...(request.description !== undefined
            ? { description: request.description.trim() }
            : {}),
          ...(request.status !== undefined ? { status: request.status } : {}),
          ...(request.priority !== undefined
            ? { priority: request.priority }
            : {}),
          ...(request.dueDate !== undefined
            ? { dueDate: request.dueDate }
            : {}),
          ...(request.assignedTo !== undefined
            ? { assignedTo: request.assignedTo }
            : {}),
        },
        requireAccessToken(),
      );

      setTask(updated);
      setSuccess(t("updateSuccess"));
      return true;
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, t("updateFailed")));
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteTaskItem(): Promise<boolean> {
    setActionLoading(true);
    setActionError(null);
    setSuccess(null);

    try {
      await deleteTask(taskId, requireAccessToken());
      const projectId = task?.projectId;
      router.replace(
        projectId ? `/projects/${projectId}/tasks?deleted=1` : "/workspaces",
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
    task,
    project,
    workspaceRole,
    members,
    currentUserId,
    loading,
    actionLoading,
    loadError,
    actionError,
    success,
    updateTaskItem,
    deleteTaskItem,
    reloadTask,
    resetFeedback,
  };
}
