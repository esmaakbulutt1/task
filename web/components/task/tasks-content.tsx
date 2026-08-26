"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import TaskCard from "@/components/task/task-card";
import TaskFilters from "@/components/task/task-filters";
import TaskForm from "@/components/task/task-form";
import Button from "@/components/ui/button";
import Dialog from "@/components/ui/dialog";
import EmptyState from "@/components/ui/empty-state";
import ErrorState from "@/components/ui/error-state";
import FormMessage from "@/components/ui/form-message";
import LoadingState from "@/components/ui/loading-state";
import PageHeader from "@/components/ui/page-header";
import Pagination from "@/components/ui/pagination";
import { useTasks } from "@/hooks/use-tasks";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { taskListQueryToSearchParams } from "@/lib/task";
import type {
  CreateTaskRequest,
  TaskFormPayload,
  TaskListQuery,
} from "@/types/task.types";

type TasksContentProps = {
  projectId: string;
  initialQuery: TaskListQuery;
  notice?: string;
};

export default function TasksContent({
  projectId,
  initialQuery,
  notice,
}: TasksContentProps) {
  const t = useTranslations("Tasks");
  const router = useRouter();
  const pathname = usePathname();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const {
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
  } = useTasks(projectId, initialQuery);

  function replaceQuery(queryToWrite: TaskListQuery): void {
    const searchParams = taskListQueryToSearchParams(queryToWrite);
    router.replace(`${pathname}?${searchParams.toString()}`, {
      scroll: false,
    });
  }

  function handleQueryChange(changes: Partial<TaskListQuery>): void {
    const nextQuery = {
      ...query,
      ...changes,
      page: changes.page ?? 1,
    };

    updateQuery(changes);
    replaceQuery(nextQuery);
  }

  async function handleCreate(payload: TaskFormPayload): Promise<boolean> {
    const request: CreateTaskRequest = {
      title: payload.title,
      description: payload.description,
      status: payload.status,
      priority: payload.priority,
      ...(payload.dueDate ? { dueDate: payload.dueDate } : {}),
      ...(payload.assignedTo ? { assignedTo: payload.assignedTo } : {}),
    };
    const created = await createTaskItem(request);

    if (created) {
      setShowCreateForm(false);

      if (query.page !== 1) {
        replaceQuery({ ...query, page: 1 });
      }
    }

    return created;
  }

  function handlePageChange(page: number): void {
    const lastPage = Math.max(pagination.totalPages, 1);
    handleQueryChange({ page: Math.min(Math.max(page, 1), lastPage) });
  }

  if (loading) {
    return <LoadingState message={t("loading")} />;
  }

  if (loadError) {
    return (
      <ErrorState
        title={t("loadError")}
        message={loadError}
        onRetry={() => void reloadTasks()}
      />
    );
  }

  const canManage = workspaceRole === "owner" || workspaceRole === "admin";
  const hasActiveFilters = Boolean(
    query.search ||
      query.status ||
      query.priority ||
      query.assignedTo ||
      query.createdBy ||
      query.dueDateFrom ||
      query.dueDateTo,
  );
  const memberEmails = new Map(
    members.map((member) => [member.userId, member.email]),
  );

  return (
    <div className="space-y-8">
      <Link
        href={`/projects/${projectId}`}
        className="inline-flex text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        {t("backToProject")}
      </Link>

      <PageHeader
        title={project ? t("projectTitle", { name: project.name }) : t("title")}
        description={t("description")}
        action={
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/projects/${projectId}/kanban`}
              className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              {t("kanbanView")}
            </Link>
            {canManage && (
              <Button
                type="button"
                fullWidth={false}
                onClick={() => {
                  resetError();
                  setShowCreateForm(true);
                }}
              >
                {t("new")}
              </Button>
            )}
          </div>
        }
      />

      {notice && <FormMessage variant="success">{notice}</FormMessage>}

      {showCreateForm && canManage && (
        <Dialog
          open={showCreateForm}
          title={t("createTitle")}
          size="lg"
          dismissible={!actionLoading}
          onClose={() => {
            resetError();
            setShowCreateForm(false);
          }}
        >
          <TaskForm
            members={members}
            submitLabel={t("create")}
            loading={actionLoading}
            error={actionError}
            onSubmit={handleCreate}
            onCancel={() => {
              resetError();
              setShowCreateForm(false);
            }}
            onInteract={resetError}
          />
        </Dialog>
      )}

      <TaskFilters
        query={query}
        members={members}
        disabled={loading}
        onChange={handleQueryChange}
      />

      {tasks.length === 0 ? (
        <EmptyState
          title={
            hasActiveFilters ? t("filteredEmptyTitle") : t("emptyTitle")
          }
          description={
            hasActiveFilters
              ? t("filteredEmptyDescription")
              : canManage
                ? t("ownerEmptyDescription")
                : t("emptyDescription")
          }
        />
      ) : (
        <section
          aria-label={t("listAriaLabel")}
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              assigneeEmail={
                task.assignedTo
                  ? memberEmails.get(task.assignedTo)
                  : undefined
              }
            />
          ))}
        </section>
      )}

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        disabled={loading}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
