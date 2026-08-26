import { useFormatter, useTranslations } from "next-intl";

import Badge from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { projectStatusTones } from "@/lib/project";
import type { Project } from "@/types/project.types";

type ProjectCardProps = {
  project: Project;
};

export default function ProjectCard({ project }: ProjectCardProps) {
  const t = useTranslations("Projects");
  const commonT = useTranslations("Common");
  const format = useFormatter();
  const statusLabels = {
    planned: commonT("projectStatus.planned"),
    active: commonT("projectStatus.active"),
    completed: commonT("projectStatus.completed"),
    archived: commonT("projectStatus.archived"),
  };
  const formatDate = (value: string | null) =>
    value ? format.dateTime(new Date(value), {dateStyle: "medium"}) : commonT("notSpecified");

  return (
    <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-semibold text-slate-950">{project.name}</h2>
        <Badge tone={projectStatusTones[project.status]}>
          {statusLabels[project.status]}
        </Badge>
      </div>

      <p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-slate-500">
        {project.description || t("noDescription")}
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm">
        <div>
          <dt className="text-slate-400">{t("detail.start")}</dt>
          <dd className="mt-1 font-medium text-slate-700">
            {formatDate(project.startDate)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">{t("detail.end")}</dt>
          <dd className="mt-1 font-medium text-slate-700">
            {formatDate(project.dueDate)}
          </dd>
        </div>
      </dl>

      <Link
        href={`/projects/${project.id}`}
        className="mt-5 text-sm font-semibold text-blue-600 hover:text-blue-700"
      >
        {t("open")}
      </Link>
    </article>
  );
}
