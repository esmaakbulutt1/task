import 'reflect-metadata';
import type { AuditQueueService } from '../audit/audit-queue.service';
import type { DbService } from '../database/db.service';
import type { NotificationQueueService } from '../notifications/notification-queue.service';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';
import { ProjectsService } from './projects.service';

jest.mock('pg-boss', () => ({ PgBoss: jest.fn() }));

describe('ProjectsService', () => {
  const query = jest
    .fn()
    .mockResolvedValueOnce({ rows: [{ total: '1' }] })
    .mockResolvedValueOnce({ rows: [{ id: 'project-id' }] });
  const service = new ProjectsService(
    { query } as unknown as DbService,
    {} as NotificationQueueService,
    {} as AuditQueueService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    query
      .mockResolvedValueOnce({ rows: [{ total: '1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'project-id' }] });
  });

  it('returns pagination metadata and filters soft-deleted projects', async () => {
    const queryDto = new ListProjectsQueryDto();
    const result = await service.findAll('workspace-id', queryDto);

    expect(result).toEqual({
      data: [{ id: 'project-id' }],
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('p.deleted_at IS NULL'),
      ['workspace-id'],
    );
  });
});
