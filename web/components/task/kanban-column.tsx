"use client";

import type { DragEvent } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import KanbanTaskCard from "@/components/task/kanban-task-card";
import Badge from "@/components/ui/badge";
import { taskStatusTones } from "@/lib/task";
import type { Task, TaskStatus } from "@/types/task.types";

type KanbanColumnProps = {
  status: TaskStatus;
  tasks: Task[];
  memberEmails: Map<string, string>;
  updatingTaskId: string | null;
  canUpdateTask: (task: Task) => boolean;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
};

export default function KanbanColumn({
  status,
  tasks,
  memberEmails,
  updatingTaskId,
  canUpdateTask,
  onStatusChange,
}: KanbanColumnProps) {
  const format = useFormatter();
  const t = useTranslations("Kanban");
  const common = useTranslations("Common");
  const [dropActive, setDropActive] = useState(false);
  const statusLabels = {
    backlog: common("taskStatus.backlog"),
    todo: common("taskStatus.todo"),
    in_progress: common("taskStatus.inProgress"),
    review: common("taskStatus.review"),
    completed: common("taskStatus.completed"),
  };

  function handleDragOver(event: DragEvent<HTMLElement>): void {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLElement>): void {
    const nextTarget = event.relatedTarget;

    if (
      !(nextTarget instanceof Node) ||
      !event.currentTarget.contains(nextTarget)
    ) {
      setDropActive(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>): void {
    event.preventDefault();
    setDropActive(false);

    const taskId = event.dataTransfer.getData("text/plain");

    if (taskId) {
      onStatusChange(taskId, status);
    }
  }

  return (
    <section
      aria-label={t("columnAriaLabel", { status: statusLabels[status] })}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`min-h-96 rounded-xl p-3 transition ${
        dropActive
          ? "bg-blue-50 ring-2 ring-blue-400 ring-inset"
          : "bg-slate-100"
      }`}
    >
      <header className="mb-3 flex items-center justify-between gap-3 px-1">
        <h2 className="text-sm font-semibold text-slate-800">
          {statusLabels[status]}
        </h2>
        <Badge tone={taskStatusTones[status]}>
          {format.number(tasks.length)}
        </Badge>
      </header>

      {tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400">
          {t("emptyColumn")}
        </p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <KanbanTaskCard
              key={task.id}
              task={task}
              assigneeEmail={
                task.assignedTo
                  ? memberEmails.get(task.assignedTo)
                  : undefined
              }
              canUpdate={canUpdateTask(task)}
              updating={updatingTaskId === task.id}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}
    </section>
  );
}
