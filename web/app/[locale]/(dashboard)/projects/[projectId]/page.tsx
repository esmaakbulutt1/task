import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import ProjectDetail from "@/components/project/project-detail";

type ProjectDetailPageProps = {
  params: Promise<{
    locale: string;
    projectId: string;
  }>;
};

export async function generateMetadata({
  params,
}: ProjectDetailPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.project" });

  return { title: t("title"), description: t("description") };
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { projectId } = await params;

  return <ProjectDetail projectId={projectId} />;
}
