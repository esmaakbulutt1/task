import { useTranslations } from "next-intl";

import Badge from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import type { Workspace } from "@/types/workspace.types";

type WorkspaceCardProps = {
  workspace: Workspace;
};

export default function WorkspaceCard({ workspace }: WorkspaceCardProps) {
  const t = useTranslations("Workspaces");
  const commonT = useTranslations("Common");
  const roleLabels = {
    owner: commonT("workspaceRole.owner"),
    admin: commonT("workspaceRole.admin"),
    member: commonT("workspaceRole.member"),
  };

  return (
    <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-semibold text-slate-950">{workspace.name}</h2>
        <Badge>{roleLabels[workspace.role]}</Badge>
      </div>

      <p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-slate-500">
        {workspace.description || t("noDescription")}
      </p>

      <Link
        href={`/workspaces/${workspace.id}`}
        className="mt-5 text-sm font-semibold text-blue-600 hover:text-blue-700"
      >
        {t("open")}
      </Link>
    </article>
  );
}
