export type DashboardCounts = {
  totalWorkspaces: number;
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  assignedTasks: number;
};

export type DashboardDistributionItem = {
  name: string;
  count: number;
};

export type DashboardTrendItem = {
  date: string;
  count: number;
};

export type DashboardSummary = {
  counts: DashboardCounts;
  statusDistribution: DashboardDistributionItem[];
  priorityDistribution: DashboardDistributionItem[];
  completedTaskTrend: DashboardTrendItem[];
};
