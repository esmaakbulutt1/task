"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { requireAccessToken } from "@/lib/client-session";
import { getErrorMessage } from "@/lib/errors";
import {
  createProject,
  getProjects,
} from "@/services/project.service";
import { getWorkspace } from "@/services/workspace.service";
import type {
  CreateProjectRequest,
  Project,
  ProjectListQuery,
  ProjectListResponse,
} from "@/types/project.types";
import type { WorkspaceRole } from "@/types/workspace.types";

type ProjectPagination = Omit<ProjectListResponse, "data">;

const initialQuery: ProjectListQuery = {
  page: 1,
  limit: 10,
  sort: "created_at",
  order: "desc",
};

const initialPagination: ProjectPagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
};

async function requestProjectsData(
  workspaceId: string,
  query: ProjectListQuery,
): Promise<[ProjectListResponse, WorkspaceRole]> {
  const accessToken = requireAccessToken();
  const [projectsResponse, workspaceResponse] = await Promise.all([
    getProjects(workspaceId, query, accessToken),
    getWorkspace(workspaceId, accessToken),
  ]);

  return [projectsResponse, workspaceResponse.role];
}

export function useProjects(workspaceId: string) {
  const t = useTranslations("Feedback.projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspaceRole, setWorkspaceRole] = useState<WorkspaceRole | null>(null);
  const [query, setQuery] = useState<ProjectListQuery>(initialQuery);
  const [pagination, setPagination] =
    useState<ProjectPagination>(initialPagination);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const applyResponse = useCallback((response: ProjectListResponse): void => {
    setProjects(response.data);
    setPagination({
      page: response.page,
      limit: response.limit,
      total: response.total,
      totalPages: response.totalPages,
    });
  }, []);

  const reloadProjects = useCallback(async (): Promise<void> => {
    setLoading(true);
    setLoadError(null);

    try {
      const [response, role] = await requestProjectsData(workspaceId, query);
      applyResponse(response);
      setWorkspaceRole(role);
    } catch (error: unknown) {
      setProjects([]);
      setPagination(initialPagination);
      setWorkspaceRole(null);
      setLoadError(getErrorMessage(error, t("loadFailed")));
    } finally {
      setLoading(false);
    }
  }, [applyResponse, query, t, workspaceId]);

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve()
      .then(() => requestProjectsData(workspaceId, query))
      .then(([response, role]) => {
        if (!cancelled) {
          setProjects(response.data);
          setPagination({
            page: response.page,
            limit: response.limit,
            total: response.total,
            totalPages: response.totalPages,
          });
          setWorkspaceRole(role);
          setLoadError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setProjects([]);
          setPagination(initialPagination);
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
  }, [query, t, workspaceId]);

  async function createProjectItem(
    request: CreateProjectRequest,
  ): Promise<boolean> {
    setActionLoading(true);
    setActionError(null);

    try {
      const description = request.description?.trim();
      await createProject(
        workspaceId,
        {
          name: request.name.trim(),
          ...(description ? { description } : {}),
          ...(request.status ? { status: request.status } : {}),
          ...(request.startDate ? { startDate: request.startDate } : {}),
          ...(request.dueDate ? { dueDate: request.dueDate } : {}),
        },
        requireAccessToken(),
      );

      const firstPageQuery = { ...query, page: 1 };

      if (query.page !== 1) {
        setLoading(true);
        setQuery(firstPageQuery);
      } else {
        const [response, role] = await requestProjectsData(
          workspaceId,
          firstPageQuery,
        );
        applyResponse(response);
        setWorkspaceRole(role);
      }

      return true;
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, t("createFailed")));
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  function updateQuery(changes: Partial<ProjectListQuery>): void {
    setLoading(true);
    setLoadError(null);
    setQuery((current) => ({
      ...current,
      ...changes,
      page: changes.page ?? 1,
    }));
  }

  function changePage(page: number): void {
    const lastPage = Math.max(pagination.totalPages, 1);
    updateQuery({ page: Math.min(Math.max(page, 1), lastPage) });
  }

  function resetError(): void {
    setActionError(null);
  }

  return {
    projects,
    workspaceRole,
    query,
    pagination,
    loading,
    actionLoading,
    loadError,
    actionError,
    createProjectItem,
    updateQuery,
    changePage,
    reloadProjects,
    resetError,
  };
}
