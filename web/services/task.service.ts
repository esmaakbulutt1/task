import { apiRequest } from "@/services/api.service";
import type {
  CreateTaskRequest,
  CreateTaskResponse,
  DeleteTaskResponse,
  TaskDetailResponse,
  TaskListQuery,
  TaskListResponse,
  UpdateTaskRequest,
  UpdateTaskResponse,
} from "@/types/task.types";

function projectTasksPath(projectId: string): string {
  return `/projects/${encodeURIComponent(projectId)}/tasks`;
}

function taskPath(taskId: string): string {
  return `/tasks/${encodeURIComponent(taskId)}`;
}

function taskListPath(projectId: string, query: TaskListQuery): string {
  const searchParams = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
    sort: query.sort,
    order: query.order,
  });

  if (query.search?.trim()) {
    searchParams.set("search", query.search.trim());
  }

  if (query.status) searchParams.set("status", query.status);
  if (query.priority) searchParams.set("priority", query.priority);
  if (query.assignedTo) searchParams.set("assignedTo", query.assignedTo);
  if (query.createdBy) searchParams.set("createdBy", query.createdBy);
  if (query.dueDateFrom) searchParams.set("dueDateFrom", query.dueDateFrom);
  if (query.dueDateTo) searchParams.set("dueDateTo", query.dueDateTo);

  return `${projectTasksPath(projectId)}?${searchParams.toString()}`;
}

export function getTasks(
  projectId: string,
  query: TaskListQuery,
  accessToken: string,
): Promise<TaskListResponse> {
  return apiRequest<TaskListResponse>(taskListPath(projectId, query), {
    method: "GET",
    token: accessToken,
  });
}

export function getTask(
  taskId: string,
  accessToken: string,
): Promise<TaskDetailResponse> {
  return apiRequest<TaskDetailResponse>(taskPath(taskId), {
    method: "GET",
    token: accessToken,
  });
}

export function createTask(
  projectId: string,
  request: CreateTaskRequest,
  accessToken: string,
): Promise<CreateTaskResponse> {
  return apiRequest<CreateTaskResponse>(projectTasksPath(projectId), {
    method: "POST",
    body: request,
    token: accessToken,
  });
}

export function updateTask(
  taskId: string,
  request: UpdateTaskRequest,
  accessToken: string,
): Promise<UpdateTaskResponse> {
  return apiRequest<UpdateTaskResponse>(taskPath(taskId), {
    method: "PATCH",
    body: request,
    token: accessToken,
  });
}

export function deleteTask(
  taskId: string,
  accessToken: string,
): Promise<DeleteTaskResponse> {
  return apiRequest<DeleteTaskResponse>(taskPath(taskId), {
    method: "DELETE",
    token: accessToken,
  });
}
