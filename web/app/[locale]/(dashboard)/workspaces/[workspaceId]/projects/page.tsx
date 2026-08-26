import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import ProjectsContent from "@/components/project/projects-content";

type ProjectsPageProps = {
  params: Promise<{
    locale: string;
    workspaceId: string;
  }>;
  searchParams: Promise<{
    deleted?: string;
  }>;
};

export async function generateMetadata({
  params,
}: ProjectsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.projects" });

  return { title: t("title"), description: t("description") };
}

export default async function ProjectsPage({
  params,
  searchParams,
}: ProjectsPageProps) {
  const [{ locale, workspaceId }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const t = await getTranslations({ locale, namespace: "Projects" });
  const notice = query.deleted === "1" ? t("deletedNotice") : undefined;

  return <ProjectsContent workspaceId={workspaceId} notice={notice} />;
}
