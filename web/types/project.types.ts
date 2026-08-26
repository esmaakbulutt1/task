export type ProjectStatus = "planned" | "active" | "completed" | "archived";

export type ProjectSort =
  | "name"
  | "status"
  | "created_at"
  | "start_date"
  | "due_date";

export type SortOrder = "asc" | "desc";

export type Project = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: string | null;
  dueDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreateProjectRequest = {
  name: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string;
  dueDate?: string;
};

export type UpdateProjectRequest = {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string;
  dueDate?: string;
};
export type ProjectListQuery = {
  page: number;
  limit: number;
  search?: string;
  status?: ProjectStatus;
  dateFrom?: string;
  dateTo?: string;
  sort: ProjectSort;
  order: SortOrder;
};

export type PaginatedProjectsResponse = {
  data: Project[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ProjectListResponse = PaginatedProjectsResponse;
export type ProjectDetailResponse = Project;
export type CreateProjectResponse = Project;
export type UpdateProjectResponse = Project;

export type DeleteProjectResponse = {
  message: string;
};
