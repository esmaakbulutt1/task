import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import TasksContent from "@/components/task/tasks-content";
import { parseTaskListQuery } from "@/lib/task";
import type { TaskSearchParams } from "@/lib/task";

type TasksPageProps = {
  params: Promise<{
    locale: string;
    projectId: string;
  }>;
  searchParams: Promise<TaskSearchParams>;
};

export async function generateMetadata({
  params,
}: TasksPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.tasks" });

  return { title: t("title"), description: t("description") };
}

export default async function TasksPage({
  params,
  searchParams,
}: TasksPageProps) {
  const [{ locale, projectId }, queryParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const t = await getTranslations({ locale, namespace: "Tasks" });
  const notice =
    queryParams.deleted === "1" ? t("deletedNotice") : undefined;
  const initialQuery = parseTaskListQuery(queryParams);

  return (
    <TasksContent
      key={JSON.stringify(initialQuery)}
      projectId={projectId}
      initialQuery={initialQuery}
      notice={notice}
    />
  );
}
