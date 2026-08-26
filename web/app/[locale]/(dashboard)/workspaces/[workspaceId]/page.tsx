import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import WorkspaceDetail from "@/components/workspace/workspace-detail";

type WorkspaceDetailPageProps = {
  params: Promise<{
    locale: string;
    workspaceId: string;
  }>;
};

export async function generateMetadata({
  params,
}: WorkspaceDetailPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.workspace" });

  return { title: t("title"), description: t("description") };
}

export default async function WorkspaceDetailPage({
  params,
}: WorkspaceDetailPageProps) {
  const { workspaceId } = await params;

  return <WorkspaceDetail workspaceId={workspaceId} />;
}
