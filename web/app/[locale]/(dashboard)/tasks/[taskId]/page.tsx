import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import TaskDetail from "@/components/task/task-detail";

type TaskDetailPageProps = {
  params: Promise<{
    locale: string;
    taskId: string;
  }>;
};

export async function generateMetadata({
  params,
}: TaskDetailPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.task" });

  return { title: t("title"), description: t("description") };
}

export default async function TaskDetailPage({
  params,
}: TaskDetailPageProps) {
  const { taskId } = await params;

  return <TaskDetail taskId={taskId} />;
}
