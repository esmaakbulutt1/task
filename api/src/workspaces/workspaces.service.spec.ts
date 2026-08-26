import type { AuditQueueService } from '../audit/audit-queue.service';
import type { DbService } from '../database/db.service';
import { WorkspacesService } from './workspaces.service';

jest.mock('pg-boss', () => ({ PgBoss: jest.fn() }));

describe('WorkspacesService', () => {
  const workspace = {
    id: 'workspace-id',
    name: 'TaskFlow',
    description: null,
    ownerId: 'owner-id',
    role: 'member',
    createdAt: new Date('2026-08-14T09:00:00.000Z'),
    updatedAt: new Date('2026-08-14T09:00:00.000Z'),
    deletedAt: null,
  };
  const query = jest.fn().mockResolvedValue({ rows: [workspace] });
  const service = new WorkspacesService(
    { query } as unknown as DbService,
    {} as AuditQueueService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists only active workspaces that the user belongs to', async () => {
    await expect(service.findAll('user-id')).resolves.toEqual([workspace]);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('wm.user_id = $1 AND w.deleted_at IS NULL'),
      ['user-id'],
    );
  });
});
