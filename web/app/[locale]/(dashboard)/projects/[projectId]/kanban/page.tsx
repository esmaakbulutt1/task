import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import KanbanBoard from "@/components/task/kanban-board";

type KanbanPageProps = {
  params: Promise<{
    locale: string;
    projectId: string;
  }>;
};

export async function generateMetadata({
  params,
}: KanbanPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.kanban" });

  return { title: t("title"), description: t("description") };
}

export default async function KanbanPage({ params }: KanbanPageProps) {
  const { projectId } = await params;

  return <KanbanBoard projectId={projectId} />;
}
