"use client";

import { useTranslations } from "next-intl";

import KanbanColumn from "@/components/task/kanban-column";
import EmptyState from "@/components/ui/empty-state";
import ErrorState from "@/components/ui/error-state";
import FormMessage from "@/components/ui/form-message";
import LoadingState from "@/components/ui/loading-state";
import PageHeader from "@/components/ui/page-header";
import { useKanban } from "@/hooks/use-kanban";
import { Link } from "@/i18n/navigation";
import { taskStatusOrder } from "@/lib/task";
import type { TaskStatus } from "@/types/task.types";

type KanbanBoardProps = {
  projectId: string;
};

export default function KanbanBoard({ projectId }: KanbanBoardProps) {
  const t = useTranslations("Kanban");
  const {
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
  } = useKanban(projectId);

  function handleStatusChange(taskId: string, status: TaskStatus): void {
    resetError();
    void changeTaskStatus(taskId, status);
  }

  if (loading) {
    return <LoadingState message={t("loading")} />;
  }

  if (loadError) {
    return (
      <ErrorState
        title={t("loadError")}
        message={loadError}
        onRetry={() => void reloadKanban()}
      />
    );
  }

  const memberEmails = new Map(
    members.map((member) => [member.userId, member.email]),
  );

  return (
    <div className="space-y-6">
      <Link
        href={`/projects/${projectId}/tasks`}
        className="inline-flex text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        {t("backToTasks")}
      </Link>

      <PageHeader
        title={project ? t("projectTitle", { name: project.name }) : t("title")}
        description={t("description", { count: tasks.length })}
        action={
          <Link
            href={`/projects/${projectId}/tasks`}
            className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            {t("listView")}
          </Link>
        }
      />

      <FormMessage>
        {workspaceRole === "member"
          ? t("memberHint")
          : t("managerHint")}
      </FormMessage>

      {actionError && <FormMessage variant="error">{actionError}</FormMessage>}

      {tasks.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <div className="overflow-x-auto pb-3">
          <div className="grid min-w-[90rem] grid-cols-5 gap-4">
            {taskStatusOrder.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={tasks.filter((task) => task.status === status)}
                memberEmails={memberEmails}
                updatingTaskId={updatingTaskId}
                canUpdateTask={canUpdateTask}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
