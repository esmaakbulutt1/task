"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { requireAccessToken } from "@/lib/client-session";
import { getErrorMessage } from "@/lib/errors";
import { getProfile } from "@/services/auth.service";
import { getProject } from "@/services/project.service";
import { getTasks, updateTask } from "@/services/task.service";
import {
  getWorkspace,
  getWorkspaceMembers,
} from "@/services/workspace.service";
import type { Project } from "@/types/project.types";
import type { Task, TaskListQuery, TaskStatus } from "@/types/task.types";
import type {
  WorkspaceMember,
  WorkspaceRole,
} from "@/types/workspace.types";

type KanbanData = {
  tasks: Task[];
  project: Project;
  workspaceRole: WorkspaceRole;
  members: WorkspaceMember[];
  currentUserId: string;
};

const kanbanQuery: TaskListQuery = {
  page: 1,
  limit: 100,
  sort: "created_at",
  order: "asc",
};

async function getAllProjectTasks(
  projectId: string,
  accessToken: string,
): Promise<Task[]> {
  const firstPage = await getTasks(projectId, kanbanQuery, accessToken);
  const tasks = [...firstPage.data];

  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    const response = await getTasks(
      projectId,
      { ...kanbanQuery, page },
      accessToken,
    );
    tasks.push(...response.data);
  }

  return tasks;
}

async function requestKanbanData(projectId: string): Promise<KanbanData> {
  const accessToken = requireAccessToken();
  const [tasks, project, profile] = await Promise.all([
    getAllProjectTasks(projectId, accessToken),
    getProject(projectId, accessToken),
    getProfile(accessToken),
  ]);
  const [workspace, members] = await Promise.all([
    getWorkspace(project.workspaceId, accessToken),
    getWorkspaceMembers(project.workspaceId, accessToken),
  ]);

  return {
    tasks,
    project,
    workspaceRole: workspace.role,
    members,
    currentUserId: profile.id,
  };
}

export function useKanban(projectId: string) {
  const t = useTranslations("Kanban");
  const feedback = useTranslations("Feedback.task");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [workspaceRole, setWorkspaceRole] = useState<WorkspaceRole | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const applyData = useCallback((data: KanbanData): void => {
    setTasks(data.tasks);
    setProject(data.project);
    setWorkspaceRole(data.workspaceRole);
    setMembers(data.members);
    setCurrentUserId(data.currentUserId);
  }, []);

  const reloadKanban = useCallback(async (): Promise<void> => {
    setLoading(true);
    setLoadError(null);

    try {
      applyData(await requestKanbanData(projectId));
    } catch (error: unknown) {
      setTasks([]);
      setProject(null);
      setWorkspaceRole(null);
      setMembers([]);
      setCurrentUserId(null);
      setLoadError(getErrorMessage(error, t("loadError")));
    } finally {
      setLoading(false);
    }
  }, [applyData, projectId, t]);

  useEffect(() => {
    let cancelled = false;

    void requestKanbanData(projectId)
      .then((data) => {
        if (!cancelled) {
          applyData(data);
          setLoadError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setTasks([]);
          setProject(null);
          setWorkspaceRole(null);
          setMembers([]);
          setCurrentUserId(null);
          setLoadError(getErrorMessage(error, t("loadError")));
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
  }, [applyData, projectId, t]);

  function canUpdateTask(task: Task): boolean {
    if (workspaceRole === "owner" || workspaceRole === "admin") {
      return true;
    }

    return workspaceRole === "member" && task.assignedTo === currentUserId;
  }

  async function changeTaskStatus(
    taskId: string,
    status: TaskStatus,
  ): Promise<boolean> {
    const previousTask = tasks.find((task) => task.id === taskId);

    if (
      !previousTask ||
      previousTask.status === status ||
      !canUpdateTask(previousTask) ||
      updatingTaskId
    ) {
      return false;
    }

    setUpdatingTaskId(taskId);
    setActionError(null);
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, status } : task,
      ),
    );

    try {
      const updated = await updateTask(
        taskId,
        { status },
        requireAccessToken(),
      );
      setTasks((current) =>
        current.map((task) => (task.id === taskId ? updated : task)),
      );
      return true;
    } catch (error: unknown) {
      setTasks((current) =>
        current.map((task) =>
          task.id === taskId ? previousTask : task,
        ),
      );
      setActionError(getErrorMessage(error, feedback("statusUpdateFailed")));
      return false;
    } finally {
      setUpdatingTaskId(null);
    }
  }

  function resetError(): void {
    setActionError(null);
  }

  return {
    tasks,
    project,
    workspaceRole,
    members,
    loading,
    updatingTaskId,
    loadError,
    actionError,
    canUpdateTask,
    changeTaskStatus,
    reloadKanban,
    resetError,
  };
}
