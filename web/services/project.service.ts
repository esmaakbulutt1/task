import { apiRequest } from "@/services/api.service";
import type {
  CreateProjectRequest,
  CreateProjectResponse,
  DeleteProjectResponse,
  ProjectDetailResponse,
  ProjectListQuery,
  ProjectListResponse,
  UpdateProjectRequest,
  UpdateProjectResponse,
} from "@/types/project.types";

function workspaceProjectsPath(workspaceId: string): string {
  return `/workspaces/${encodeURIComponent(workspaceId)}/projects`;
}

function projectPath(projectId: string): string {
  return `/projects/${encodeURIComponent(projectId)}`;
}

function projectListPath(
  workspaceId: string,
  query: ProjectListQuery,
): string {
  const searchParams = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
    sort: query.sort,
    order: query.order,
  });

  if (query.search?.trim()) {
    searchParams.set("search", query.search.trim());
  }

  if (query.status) {
    searchParams.set("status", query.status);
  }

  if (query.dateFrom) {
    searchParams.set("dateFrom", query.dateFrom);
  }

  if (query.dateTo) {
    searchParams.set("dateTo", query.dateTo);
  }

  return `${workspaceProjectsPath(workspaceId)}?${searchParams.toString()}`;
}

export function getProjects(
  workspaceId: string,
  query: ProjectListQuery,
  accessToken: string,
): Promise<ProjectListResponse> {
  return apiRequest<ProjectListResponse>(projectListPath(workspaceId, query), {
    method: "GET",
    token: accessToken,
  });
}

export function getProject(
  projectId: string,
  accessToken: string,
): Promise<ProjectDetailResponse> {
  return apiRequest<ProjectDetailResponse>(projectPath(projectId), {
    method: "GET",
    token: accessToken,
  });
}

export function createProject(
  workspaceId: string,
  request: CreateProjectRequest,
  accessToken: string,
): Promise<CreateProjectResponse> {
  return apiRequest<CreateProjectResponse>(workspaceProjectsPath(workspaceId), {
    method: "POST",
    body: request,
    token: accessToken,
  });
}

export function updateProject(
  projectId: string,
  request: UpdateProjectRequest,
  accessToken: string,
): Promise<UpdateProjectResponse> {
  return apiRequest<UpdateProjectResponse>(projectPath(projectId), {
    method: "PATCH",
    body: request,
    token: accessToken,
  });
}

export function deleteProject(
  projectId: string,
  accessToken: string,
): Promise<DeleteProjectResponse> {
  return apiRequest<DeleteProjectResponse>(projectPath(projectId), {
    method: "DELETE",
    token: accessToken,
  });
}
