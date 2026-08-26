"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { requireAccessToken } from "@/lib/client-session";
import { getErrorMessage } from "@/lib/errors";
import { defaultTaskListQuery } from "@/lib/task";
import { getProject } from "@/services/project.service";
import { createTask, getTasks } from "@/services/task.service";
import {
  getWorkspace,
  getWorkspaceMembers,
} from "@/services/workspace.service";
import type { Project } from "@/types/project.types";
import type {
  CreateTaskRequest,
  Task,
  TaskListQuery,
  TaskListResponse,
} from "@/types/task.types";
import type {
  WorkspaceMember,
  WorkspaceRole,
} from "@/types/workspace.types";

type TaskPagination = Omit<TaskListResponse, "data">;

type TasksData = {
  response: TaskListResponse;
  project: Project;
  workspaceRole: WorkspaceRole;
  members: WorkspaceMember[];
};

async function requestTasksData(
  projectId: string,
  query: TaskListQuery,
): Promise<TasksData> {
  const accessToken = requireAccessToken();
  const [response, project] = await Promise.all([
    getTasks(projectId, query, accessToken),
    getProject(projectId, accessToken),
  ]);
  const [workspace, members] = await Promise.all([
    getWorkspace(project.workspaceId, accessToken),
    getWorkspaceMembers(project.workspaceId, accessToken),
  ]);

  return {
    response,
    project,
    workspaceRole: workspace.role,
    members,
  };
}

export function useTasks(
  projectId: string,
  initialQuery: TaskListQuery = defaultTaskListQuery,
) {
  const t = useTranslations("Feedback.tasks");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [workspaceRole, setWorkspaceRole] = useState<WorkspaceRole | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [query, setQuery] = useState<TaskListQuery>(() => ({ ...initialQuery }));
  const [pagination, setPagination] = useState<TaskPagination>({
    page: initialQuery.page,
    limit: initialQuery.limit,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const applyData = useCallback((data: TasksData): void => {
    setTasks(data.response.data);
    setPagination({
      page: data.response.page,
      limit: data.response.limit,
      total: data.response.total,
      totalPages: data.response.totalPages,
    });
    setProject(data.project);
    setWorkspaceRole(data.workspaceRole);
    setMembers(data.members);
  }, []);

  const reloadTasks = useCallback(async (): Promise<void> => {
    setLoading(true);
    setLoadError(null);

    try {
      applyData(await requestTasksData(projectId, query));
    } catch (error: unknown) {
      setTasks([]);
      setProject(null);
      setWorkspaceRole(null);
      setMembers([]);
      setLoadError(getErrorMessage(error, t("loadFailed")));
    } finally {
      setLoading(false);
    }
  }, [applyData, projectId, query, t]);

  useEffect(() => {
    let cancelled = false;

    void requestTasksData(projectId, query)
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
  }, [applyData, projectId, query, t]);

  async function createTaskItem(
    request: CreateTaskRequest,
  ): Promise<boolean> {
    setActionLoading(true);
    setActionError(null);

    try {
      const description = request.description?.trim();
      await createTask(
        projectId,
        {
          title: request.title.trim(),
          ...(description ? { description } : {}),
          ...(request.status ? { status: request.status } : {}),
          ...(request.priority ? { priority: request.priority } : {}),
          ...(request.dueDate ? { dueDate: request.dueDate } : {}),
          ...(request.assignedTo ? { assignedTo: request.assignedTo } : {}),
        },
        requireAccessToken(),
      );

      const firstPageQuery = { ...query, page: 1 };

      if (query.page !== 1) {
        setLoading(true);
        setQuery(firstPageQuery);
      } else {
        applyData(await requestTasksData(projectId, firstPageQuery));
      }

      return true;
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, t("createFailed")));
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  function updateQuery(changes: Partial<TaskListQuery>): void {
    setLoading(true);
    setLoadError(null);
    setQuery((current) => ({
      ...current,
      ...changes,
      page: changes.page ?? 1,
    }));
  }

  function resetError(): void {
    setActionError(null);
  }

  return {
    tasks,
    project,
    workspaceRole,
    members,
    query,
    pagination,
    loading,
    actionLoading,
    loadError,
    actionError,
    createTaskItem,
    updateQuery,
    reloadTasks,
    resetError,
  };
}
