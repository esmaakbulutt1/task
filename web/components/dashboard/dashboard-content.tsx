"use client";

import { useTranslations } from "next-intl";

import DistributionList from "@/components/dashboard/distribution-list";
import SummaryCard from "@/components/dashboard/summary-card";
import TaskTrend from "@/components/dashboard/task-trend";
import ErrorState from "@/components/ui/error-state";
import LoadingState from "@/components/ui/loading-state";
import PageHeader from "@/components/ui/page-header";
import { useDashboard } from "@/hooks/use-dashboard";

export default function DashboardContent() {
  const t = useTranslations("Dashboard");
  const commonT = useTranslations("Common");
  const { data, loading, error, reloadDashboard } = useDashboard();
  const statusLabels: Record<string, string> = {
    backlog: commonT("taskStatus.backlog"),
    todo: commonT("taskStatus.todo"),
    in_progress: commonT("taskStatus.inProgress"),
    review: commonT("taskStatus.review"),
    completed: commonT("taskStatus.completed"),
  };
  const priorityLabels: Record<string, string> = {
    low: commonT("priorityLabels.low"),
    medium: commonT("priorityLabels.medium"),
    high: commonT("priorityLabels.high"),
    urgent: commonT("priorityLabels.urgent"),
  };

  if (loading) {
    return <LoadingState message={t("loading")} />;
  }

  if (error) {
    return (
      <ErrorState
        title={t("loadError")}
        message={error}
        onRetry={() => void reloadDashboard()}
      />
    );
  }

  if (!data) {
    return null;
  }

  const { counts } = data;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />

      <section
        aria-label={t("summaryAriaLabel")}
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <SummaryCard
          label={t("summary.workspaces")}
          value={counts.totalWorkspaces}
          description={t("summary.workspacesDescription")}
        />
        <SummaryCard
          label={t("summary.projects")}
          value={counts.totalProjects}
          description={t("summary.projectsDescription")}
        />
        <SummaryCard
          label={t("summary.totalTasks")}
          value={counts.totalTasks}
          description={t("summary.totalTasksDescription")}
        />
        <SummaryCard
          label={t("summary.assignedTasks")}
          value={counts.assignedTasks}
          description={t("summary.assignedTasksDescription")}
        />
        <SummaryCard
          label={t("summary.completedTasks")}
          value={counts.completedTasks}
          description={t("summary.completedTasksDescription")}
        />
        <SummaryCard
          label={t("summary.inProgressTasks")}
          value={counts.inProgressTasks}
          description={t("summary.inProgressTasksDescription")}
        />
        <SummaryCard
          label={t("summary.overdueTasks")}
          value={counts.overdueTasks}
          description={t("summary.overdueTasksDescription")}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <DistributionList
          title={t("statusDistribution")}
          items={data.statusDistribution}
          labels={statusLabels}
        />
        <DistributionList
          title={t("priorityDistribution")}
          items={data.priorityDistribution}
          labels={priorityLabels}
        />
      </div>

      <TaskTrend items={data.completedTaskTrend} />
    </div>
  );
}
