import { Injectable } from '@nestjs/common';
import { DbService } from '../database/db.service';

export interface DashboardCounts {
  totalWorkspaces: number;
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  assignedTasks: number;
}

export interface DashboardDistributionItem {
  name: string;
  count: number;
}

export interface DashboardTrendItem {
  date: string;
  count: number;
}

export interface DashboardSummary {
  counts: DashboardCounts;
  statusDistribution: DashboardDistributionItem[];
  priorityDistribution: DashboardDistributionItem[];
  completedTaskTrend: DashboardTrendItem[];
}

interface DashboardSummaryRow extends DashboardCounts {
  statusDistribution: DashboardDistributionItem[];
  priorityDistribution: DashboardDistributionItem[];
  completedTaskTrend: DashboardTrendItem[];
}

@Injectable()
export class DashboardService {
  constructor(private readonly dbService: DbService) {}

  async getSummary(userId: string): Promise<DashboardSummary> {
    const result = await this.dbService.query<DashboardSummaryRow>(
      `
        WITH accessible_workspaces AS (
          SELECT w.id
          FROM workspace_members wm
          INNER JOIN workspaces w ON w.id = wm.workspace_id
          WHERE wm.user_id = $1
            AND w.deleted_at IS NULL
        ),
        accessible_projects AS (
          SELECT p.id
          FROM projects p
          INNER JOIN accessible_workspaces aw ON aw.id = p.workspace_id
          WHERE p.deleted_at IS NULL
        ),
        accessible_tasks AS (
          SELECT
            t.status,
            t.priority,
            t.due_date,
            t.assigned_to,
            t.updated_at
          FROM tasks t
          INNER JOIN accessible_projects ap ON ap.id = t.project_id
          WHERE t.deleted_at IS NULL
        ),
        task_statuses(name, position) AS (
          VALUES
            ('backlog', 1),
            ('todo', 2),
            ('in_progress', 3),
            ('review', 4),
            ('completed', 5)
        ),
        task_priorities(name, position) AS (
          VALUES
            ('low', 1),
            ('medium', 2),
            ('high', 3),
            ('urgent', 4)
        ),
        status_counts AS (
          SELECT status AS name, COUNT(*)::integer AS count
          FROM accessible_tasks
          GROUP BY status
        ),
        priority_counts AS (
          SELECT priority AS name, COUNT(*)::integer AS count
          FROM accessible_tasks
          GROUP BY priority
        ),
        trend_dates AS (
          SELECT GENERATE_SERIES(
            CURRENT_DATE - INTERVAL '6 days',
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS date
        ),
        completed_counts AS (
          SELECT
            updated_at::date AS date,
            COUNT(*)::integer AS count
          FROM accessible_tasks
          WHERE status = 'completed'
            AND updated_at >= CURRENT_DATE - INTERVAL '6 days'
            AND updated_at < CURRENT_DATE + INTERVAL '1 day'
          GROUP BY updated_at::date
        )
        SELECT
          (SELECT COUNT(*)::integer FROM accessible_workspaces)
            AS "totalWorkspaces",
          (SELECT COUNT(*)::integer FROM accessible_projects)
            AS "totalProjects",
          (SELECT COUNT(*)::integer FROM accessible_tasks)
            AS "totalTasks",
          (SELECT COUNT(*)::integer FROM accessible_tasks WHERE status = 'completed')
            AS "completedTasks",
          (SELECT COUNT(*)::integer FROM accessible_tasks WHERE status = 'in_progress')
            AS "inProgressTasks",
          (
            SELECT COUNT(*)::integer
            FROM accessible_tasks
            WHERE due_date < NOW()
              AND status <> 'completed'
          ) AS "overdueTasks",
          (
            SELECT COUNT(*)::integer
            FROM accessible_tasks
            WHERE assigned_to = $1
          ) AS "assignedTasks",
          (
            SELECT JSONB_AGG(
              JSONB_BUILD_OBJECT(
                'name', ts.name,
                'count', COALESCE(sc.count, 0)
              )
              ORDER BY ts.position
            )
            FROM task_statuses ts
            LEFT JOIN status_counts sc ON sc.name = ts.name
          ) AS "statusDistribution",
          (
            SELECT JSONB_AGG(
              JSONB_BUILD_OBJECT(
                'name', tp.name,
                'count', COALESCE(pc.count, 0)
              )
              ORDER BY tp.position
            )
            FROM task_priorities tp
            LEFT JOIN priority_counts pc ON pc.name = tp.name
          ) AS "priorityDistribution",
          (
            SELECT JSONB_AGG(
              JSONB_BUILD_OBJECT(
                'date', TO_CHAR(td.date, 'YYYY-MM-DD'),
                'count', COALESCE(cc.count, 0)
              )
              ORDER BY td.date
            )
            FROM trend_dates td
            LEFT JOIN completed_counts cc ON cc.date = td.date
          ) AS "completedTaskTrend"
      `,
      [userId],
    );
    const summary = result.rows[0];

    return {
      counts: {
        totalWorkspaces: summary.totalWorkspaces,
        totalProjects: summary.totalProjects,
        totalTasks: summary.totalTasks,
        completedTasks: summary.completedTasks,
        inProgressTasks: summary.inProgressTasks,
        overdueTasks: summary.overdueTasks,
        assignedTasks: summary.assignedTasks,
      },
      statusDistribution: summary.statusDistribution,
      priorityDistribution: summary.priorityDistribution,
      completedTaskTrend: summary.completedTaskTrend,
    };
  }
}
