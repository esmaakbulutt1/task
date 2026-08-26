import type {
  TaskListQuery,
  TaskPriority,
  TaskSort,
  TaskSortOrder,
  TaskStatus,
} from "@/types/task.types";

type TaskBadgeTone = "neutral" | "blue" | "green" | "yellow" | "red";

export type TaskSearchParams = Record<
  string,
  string | string[] | undefined
>;

export const defaultTaskListQuery: TaskListQuery = {
  page: 1,
  limit: 10,
  sort: "created_at",
  order: "desc",
};

export const taskStatusTones: Record<TaskStatus, TaskBadgeTone> = {
  backlog: "neutral",
  todo: "blue",
  in_progress: "yellow",
  review: "blue",
  completed: "green",
};

export const taskPriorityTones: Record<TaskPriority, TaskBadgeTone> = {
  low: "neutral",
  medium: "blue",
  high: "yellow",
  urgent: "red",
};

export const taskStatusOrder: TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "review",
  "completed",
];

const taskPriorities: TaskPriority[] = ["low", "medium", "high", "urgent"];

const taskSorts: TaskSort[] = [
  "title",
  "status",
  "priority",
  "due_date",
  "created_at",
  "updated_at",
];

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInteger(
  value: string | undefined,
  fallback: number,
  maximum?: number,
): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return maximum ? Math.min(parsed, maximum) : parsed;
}

function dateValue(value: string | undefined): string | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

export function parseTaskListQuery(
  params: TaskSearchParams,
): TaskListQuery {
  const status = firstValue(params.status);
  const priority = firstValue(params.priority);
  const sort = firstValue(params.sort);
  const order = firstValue(params.order);
  const search = firstValue(params.search)?.trim();
  const assignedTo = firstValue(params.assignedTo)?.trim();
  const createdBy = firstValue(params.createdBy)?.trim();
  const dueDateFrom = dateValue(firstValue(params.dueDateFrom));
  const dueDateTo = dateValue(firstValue(params.dueDateTo));

  return {
    page: positiveInteger(firstValue(params.page), 1),
    limit: positiveInteger(firstValue(params.limit), 10, 100),
    ...(search ? { search: search.slice(0, 100) } : {}),
    ...(taskStatusOrder.includes(status as TaskStatus)
      ? { status: status as TaskStatus }
      : {}),
    ...(taskPriorities.includes(priority as TaskPriority)
      ? { priority: priority as TaskPriority }
      : {}),
    ...(assignedTo ? { assignedTo } : {}),
    ...(createdBy ? { createdBy } : {}),
    ...(dueDateFrom ? { dueDateFrom } : {}),
    ...(dueDateTo ? { dueDateTo } : {}),
    sort: taskSorts.includes(sort as TaskSort)
      ? (sort as TaskSort)
      : defaultTaskListQuery.sort,
    order:
      order === "asc" || order === "desc"
        ? (order as TaskSortOrder)
        : defaultTaskListQuery.order,
  };
}

export function taskListQueryToSearchParams(
  query: TaskListQuery,
): URLSearchParams {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
    sort: query.sort,
    order: query.order,
  });

  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.priority) params.set("priority", query.priority);
  if (query.assignedTo) params.set("assignedTo", query.assignedTo);
  if (query.createdBy) params.set("createdBy", query.createdBy);
  if (query.dueDateFrom) params.set("dueDateFrom", query.dueDateFrom);
  if (query.dueDateTo) params.set("dueDateTo", query.dueDateTo);

  return params;
}

export function toDateTimeInputValue(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (part: number): string => String(part).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function dateTimeInputToIso(value: string): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
