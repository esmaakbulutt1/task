import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import WorkspacesContent from "@/components/workspace/workspaces-content";

type WorkspacesPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    deleted?: string;
  }>;
};

export async function generateMetadata({
  params,
}: WorkspacesPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.workspaces" });

  return { title: t("title"), description: t("description") };
}

export default async function WorkspacesPage({
  params,
  searchParams,
}: WorkspacesPageProps) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const t = await getTranslations({ locale, namespace: "Workspaces" });
  const notice =
    query.deleted === "1" ? t("deletedNotice") : undefined;

  return <WorkspacesContent notice={notice} />;
}
