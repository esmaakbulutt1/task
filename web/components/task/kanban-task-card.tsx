"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { DragEvent } from "react";

import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  taskPriorityTones,
  taskStatusOrder,
} from "@/lib/task";
import type { Task, TaskStatus } from "@/types/task.types";

type KanbanTaskCardProps = {
  task: Task;
  assigneeEmail?: string;
  canUpdate: boolean;
  updating: boolean;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
};

export default function KanbanTaskCard({
  task,
  assigneeEmail,
  canUpdate,
  updating,
  onStatusChange,
}: KanbanTaskCardProps) {
  const format = useFormatter();
  const t = useTranslations("Kanban");
  const tasks = useTranslations("Tasks");
  const common = useTranslations("Common");
  const statusIndex = taskStatusOrder.indexOf(task.status);
  const previousStatus = taskStatusOrder[statusIndex - 1];
  const nextStatus = taskStatusOrder[statusIndex + 1];
  const priorityLabels = {
    low: common("priorityLabels.low"),
    medium: common("priorityLabels.medium"),
    high: common("priorityLabels.high"),
    urgent: common("priorityLabels.urgent"),
  };
  const dueDate = task.dueDate
    ? format.dateTime(new Date(task.dueDate), {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : common("notSpecified");

  function handleDragStart(event: DragEvent<HTMLElement>): void {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", task.id);
  }

  return (
    <article
      aria-busy={updating || undefined}
      draggable={canUpdate && !updating}
      title={
        canUpdate
          ? t("dragHint")
          : undefined
      }
      onDragStart={handleDragStart}
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition ${
        canUpdate && !updating
          ? "cursor-grab active:cursor-grabbing"
          : ""
      } ${updating ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold leading-5 text-slate-900">
          {task.title}
        </h3>
        <Badge tone={taskPriorityTones[task.priority]}>
          {priorityLabels[task.priority]}
        </Badge>
      </div>

      {task.description && (
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
          {task.description}
        </p>
      )}

      <dl className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">{tasks("detail.assignee")}</dt>
          <dd className="truncate font-medium text-slate-600">
            {assigneeEmail ?? common("unassigned")}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">{tasks("detail.dueDate")}</dt>
          <dd className="font-medium text-slate-600">{dueDate}</dd>
        </div>
      </dl>

      <Link
        href={`/tasks/${task.id}`}
        className="mt-4 inline-flex text-xs font-semibold text-blue-600 hover:text-blue-700"
      >
        {t("openDetail")}
      </Link>

      {canUpdate && (
        <div className="mt-4 flex justify-between gap-2 border-t border-slate-100 pt-3">
          {previousStatus ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              fullWidth={false}
              disabled={updating}
              onClick={() => onStatusChange(task.id, previousStatus)}
            >
              {t("previous")}
            </Button>
          ) : (
            <span />
          )}

          {nextStatus && (
            <Button
              type="button"
              size="sm"
              fullWidth={false}
              disabled={updating}
              onClick={() => onStatusChange(task.id, nextStatus)}
            >
              {t("next")}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
