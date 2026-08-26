import type { DbService } from '../database/db.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import type { QueueService } from '../queue/queue.service';
import { ImportsService } from './imports.service';

jest.mock('pg-boss', () => ({ PgBoss: jest.fn() }));

describe('ImportsService', () => {
  const query = jest.fn();
  const enqueue = jest.fn().mockResolvedValue('parse-job-id');
  const service = new ImportsService(
    { query } as unknown as DbService,
    { enqueue } as unknown as QueueService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an import record and queues the parse job', async () => {
    const importJob = {
      id: 'import-id',
      workspaceId: 'workspace-id',
      projectId: 'project-id',
      userId: 'user-id',
      fileName: 'tasks.csv',
      storedFileName: 'stored.csv',
      status: 'pending',
      totalRows: 0,
      processedRows: 0,
      failedRows: 0,
      parsingFinished: false,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    query
      .mockResolvedValueOnce({ rows: [{ workspaceId: 'workspace-id' }] })
      .mockResolvedValueOnce({ rows: [importJob] });

    const result = await service.create(
      'project-id',
      'user-id',
      'tasks.csv',
      'stored.csv',
    );

    expect(enqueue).toHaveBeenCalledWith(
      QUEUE_NAMES.PARSE_TASK_CSV,
      { importJobId: 'import-id' },
      {
        singletonKey: 'import-id',
        singletonSeconds: 7 * 24 * 60 * 60,
      },
    );
    expect(result).toBe(importJob);
  });
});
