import type { DbService } from '../database/db.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  const summaryRow = {
    totalWorkspaces: 2,
    totalProjects: 4,
    totalTasks: 12,
    completedTasks: 5,
    inProgressTasks: 3,
    overdueTasks: 1,
    assignedTasks: 6,
    statusDistribution: [
      { name: 'backlog', count: 1 },
      { name: 'todo', count: 2 },
      { name: 'in_progress', count: 3 },
      { name: 'review', count: 1 },
      { name: 'completed', count: 5 },
    ],
    priorityDistribution: [
      { name: 'low', count: 2 },
      { name: 'medium', count: 4 },
      { name: 'high', count: 3 },
      { name: 'urgent', count: 3 },
    ],
    completedTaskTrend: [
      { date: '2026-08-13', count: 2 },
      { date: '2026-08-14', count: 1 },
    ],
  };
  const query = jest.fn().mockResolvedValue({ rows: [summaryRow] });
  const service = new DashboardService({ query } as unknown as DbService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a summary limited to the signed-in user workspaces', async () => {
    const result = await service.getSummary('user-id');

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE wm.user_id = $1'),
      ['user-id'],
    );
    expect(query.mock.calls[0][0]).toContain('w.deleted_at IS NULL');
    expect(query.mock.calls[0][0]).toContain('p.deleted_at IS NULL');
    expect(query.mock.calls[0][0]).toContain('t.deleted_at IS NULL');
    expect(result).toEqual({
      counts: {
        totalWorkspaces: 2,
        totalProjects: 4,
        totalTasks: 12,
        completedTasks: 5,
        inProgressTasks: 3,
        overdueTasks: 1,
        assignedTasks: 6,
      },
      statusDistribution: summaryRow.statusDistribution,
      priorityDistribution: summaryRow.priorityDistribution,
      completedTaskTrend: summaryRow.completedTaskTrend,
    });
  });
});
