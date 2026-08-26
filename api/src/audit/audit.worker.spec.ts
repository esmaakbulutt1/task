import { Logger } from '@nestjs/common';
import type { DbService } from '../database/db.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import type { QueueService } from '../queue/queue.service';
import type { AuditLogJobData } from './audit-job.types';
import { AuditWorker } from './audit.worker';

jest.mock('pg-boss', () => ({ PgBoss: jest.fn() }));

type TestJobHandler = (
  jobs: Array<{ id: string; data: AuditLogJobData }>,
) => Promise<unknown>;

describe('AuditWorker', () => {
  let handler: TestJobHandler | undefined;

  const registerWorker = jest.fn(
    async (_queueName: string, registeredHandler: TestJobHandler) => {
      handler = registeredHandler;
      return 'audit-worker-id';
    },
  );
  const query = jest.fn().mockResolvedValue({ rows: [] });
  const worker = new AuditWorker(
    { registerWorker } as unknown as QueueService,
    { query } as unknown as DbService,
  );

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    handler = undefined;
    await worker.onModuleInit();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('registers on the audit queue and inserts retry-safe rows', async () => {
    expect(registerWorker).toHaveBeenCalledWith(
      QUEUE_NAMES.AUDIT_LOG,
      expect.any(Function),
    );
    expect(handler).toBeDefined();

    await handler?.([
      {
        id: 'job-id',
        data: {
          eventId: 'event-id',
          workspaceId: 'workspace-id',
          userId: 'user-id',
          action: 'task.updated',
          entityType: 'task',
          entityId: 'task-id',
          oldData: { status: 'todo' },
          newData: { status: 'completed' },
          occurredAt: '2026-08-14T09:00:00.000Z',
        },
      },
    ]);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (event_id) DO NOTHING'),
      [
        'event-id',
        'workspace-id',
        'user-id',
        'task.updated',
        'task',
        'task-id',
        JSON.stringify({ status: 'todo' }),
        JSON.stringify({ status: 'completed' }),
        '2026-08-14T09:00:00.000Z',
      ],
    );
  });
});
