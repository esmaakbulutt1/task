import { useFormatter, useTranslations } from "next-intl";

import Badge from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import {
  taskPriorityTones,
  taskStatusTones,
} from "@/lib/task";
import type { Task } from "@/types/task.types";

type TaskCardProps = {
  task: Task;
  assigneeEmail?: string;
};

export default function TaskCard({ task, assigneeEmail }: TaskCardProps) {
  const format = useFormatter();
  const t = useTranslations("Tasks");
  const common = useTranslations("Common");
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
  const dueDate = task.dueDate
    ? format.dateTime(new Date(task.dueDate), {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : common("notSpecified");

  return (
    <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-semibold text-slate-950">{task.title}</h2>
        <div className="flex flex-wrap gap-2">
          <Badge tone={taskStatusTones[task.status]}>
            {statusLabels[task.status]}
          </Badge>
          <Badge tone={taskPriorityTones[task.priority]}>
            {priorityLabels[task.priority]}
          </Badge>
        </div>
      </div>

      <p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-slate-500">
        {task.description || t("noDescription")}
      </p>

      <dl className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm">
        <div className="flex items-start justify-between gap-4">
          <dt className="text-slate-400">{t("detail.assignee")}</dt>
          <dd className="truncate font-medium text-slate-700">
            {assigneeEmail ?? common("unassigned")}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-4">
          <dt className="text-slate-400">{t("detail.dueDate")}</dt>
          <dd className="font-medium text-slate-700">{dueDate}</dd>
        </div>
      </dl>

      <Link
        href={`/tasks/${task.id}`}
        className="mt-5 text-sm font-semibold text-blue-600 hover:text-blue-700"
      >
        {t("open")}
      </Link>
    </article>
  );
}
