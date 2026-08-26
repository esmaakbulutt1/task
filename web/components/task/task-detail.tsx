"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import AttachmentsSection from "@/components/attachment/attachments-section";
import CommentsSection from "@/components/comment/comments-section";
import TaskForm from "@/components/task/task-form";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import ConfirmPanel from "@/components/ui/confirm-panel";
import Dialog from "@/components/ui/dialog";
import ErrorState from "@/components/ui/error-state";
import FormMessage from "@/components/ui/form-message";
import LoadingState from "@/components/ui/loading-state";
import { useTask } from "@/hooks/use-task";
import { Link } from "@/i18n/navigation";
import {
  taskPriorityTones,
  taskStatusTones,
} from "@/lib/task";
import type {
  TaskFormPayload,
  UpdateTaskRequest,
} from "@/types/task.types";

type TaskDetailProps = {
  taskId: string;
};

export default function TaskDetail({ taskId }: TaskDetailProps) {
  const format = useFormatter();
  const t = useTranslations("Tasks");
  const common = useTranslations("Common");
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const {
    task,
    project,
    workspaceRole,
    members,
    currentUserId,
    loading,
    actionLoading,
    loadError,
    actionError,
    success,
    updateTaskItem,
    deleteTaskItem,
    reloadTask,
    resetFeedback,
  } = useTask(taskId);

  const canManage = workspaceRole === "owner" || workspaceRole === "admin";
  const canEdit = Boolean(
    canManage ||
      (workspaceRole === "member" &&
        currentUserId &&
        task?.assignedTo === currentUserId),
  );

  async function handleUpdate(payload: TaskFormPayload): Promise<boolean> {
    const request: UpdateTaskRequest = {
      title: payload.title,
      description: payload.description,
      status: payload.status,
      priority: payload.priority,
      dueDate: payload.dueDate,
      ...(canManage ? { assignedTo: payload.assignedTo } : {}),
    };
    const updated = await updateTaskItem(request);

    if (updated) {
      setEditing(false);
    }

    return updated;
  }

  if (loading) {
    return <LoadingState message={t("detail.loading")} />;
  }

  if (loadError) {
    return (
      <ErrorState
        title={t("detail.loadError")}
        message={loadError}
        onRetry={() => void reloadTask()}
      />
    );
  }

  if (!task) {
    return null;
  }

  const assignee = members.find((member) => member.userId === task.assignedTo);
  const creator = members.find((member) => member.userId === task.createdBy);
  const statusLabels = {
    backlog: common("taskStatus.backlog"),
    todo: common("taskStatus.todo"),
    in_progress: common("taskStatus.inProgress"),
    review: common("taskStatus.review"),
    completed: common("taskStatus.completed"),
  };
  const priorityLabels = {
    low: common("priorityLabels.low"),
    medium: common("priorityLabels.medium"),
    high: common("priorityLabels.high"),
    urgent: common("priorityLabels.urgent"),
  };
  const formatDate = (value: string | null): string =>
    value
      ? format.dateTime(new Date(value), {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : common("notSpecified");

  return (
    <div className="space-y-6">
      <Link
        href={`/projects/${task.projectId}/tasks`}
        className="inline-flex text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        {t("detail.back")}
      </Link>

      <header className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                {task.title}
              </h1>
              <Badge tone={taskStatusTones[task.status]}>
                {statusLabels[task.status]}
              </Badge>
              <Badge tone={taskPriorityTones[task.priority]}>
                {priorityLabels[task.priority]}
              </Badge>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              {task.description || t("noDescription")}
            </p>
          </div>

          {canEdit && (
            <div className="flex gap-3">
              {canEdit && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  onClick={() => {
                    resetFeedback();
                    setConfirmingDelete(false);
                    setEditing(true);
                  }}
                >
                  {common("edit")}
                </Button>
              )}
              {canManage && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  fullWidth={false}
                  onClick={() => {
                    resetFeedback();
                    setEditing(false);
                    setConfirmingDelete(true);
                  }}
                >
                  {common("delete")}
                </Button>
              )}
            </div>
          )}
        </div>

        <dl className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {t("detail.project")}
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-700">
              {project?.name ?? common("notSpecified")}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {t("detail.assignee")}
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-700">
              {assignee?.email ?? common("unassigned")}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {t("detail.dueDate")}
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-700">
              {formatDate(task.dueDate)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {t("detail.creator")}
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-700">
              {creator?.email ?? common("unknown")}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {common("updatedAt")}
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-700">
              {formatDate(task.updatedAt)}
            </dd>
          </div>
        </dl>
      </header>

      {actionError && <FormMessage variant="error">{actionError}</FormMessage>}
      {success && <FormMessage variant="success">{success}</FormMessage>}

      {editing && canEdit && (
        <Dialog
          open={editing}
          title={t("detail.editTitle")}
          size="lg"
          dismissible={!actionLoading}
          onClose={() => {
            resetFeedback();
            setEditing(false);
          }}
        >
          <TaskForm
            key={task.updatedAt}
            initialValues={{
              title: task.title,
              description: task.description ?? "",
              status: task.status,
              priority: task.priority,
              dueDate: task.dueDate,
              assignedTo: task.assignedTo,
            }}
            members={members}
            canAssign={canManage}
            submitLabel={common("saveChanges")}
            loading={actionLoading}
            error={actionError}
            onSubmit={handleUpdate}
            onCancel={() => {
              resetFeedback();
              setEditing(false);
            }}
            onInteract={resetFeedback}
          />
        </Dialog>
      )}

      {confirmingDelete && canManage && (
        <ConfirmPanel
          title={t("detail.deleteTitle")}
          description={t("detail.deleteDescription")}
          confirmLabel={common("yesDelete")}
          loading={actionLoading}
          loadingText={common("deleting")}
          onConfirm={() => void deleteTaskItem()}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}

      {workspaceRole && currentUserId && (
        <CommentsSection
          taskId={task.id}
          members={members}
          currentUserId={currentUserId}
          workspaceRole={workspaceRole}
        />
      )}

      {workspaceRole && (
        <AttachmentsSection
          taskId={task.id}
          members={members}
          workspaceRole={workspaceRole}
        />
      )}
    </div>
  );
}
