export type TaskStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "review"
  | "completed";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TaskSort =
  | "title"
  | "status"
  | "priority"
  | "due_date"
  | "created_at"
  | "updated_at";

export type TaskSortOrder = "asc" | "desc";

export type TaskBase = {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignedTo: string | null;
};

export type Task = TaskBase & {
  id: string;
  projectId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreateTaskRequest = {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  assignedTo?: string;
};

export type UpdateTaskRequest = {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  assignedTo?: string | null;
};

export type TaskFormPayload = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignedTo: string | null;
};

export type TaskListQuery = {
  page: number;
  limit: number;
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string;
  createdBy?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  sort: TaskSort;
  order: TaskSortOrder;
};

export type PaginatedTasksResponse = {
  data: Task[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type TaskListResponse = PaginatedTasksResponse;
export type TaskDetailResponse = Task;
export type CreateTaskResponse = Task;
export type UpdateTaskResponse = Task;

export type DeleteTaskResponse = {
  message: string;
};
