import { QUEUE_NAMES } from '../queue/queue.constants';
import type { QueueService } from '../queue/queue.service';
import { AuditQueueService } from './audit-queue.service';

jest.mock('pg-boss', () => ({ PgBoss: jest.fn() }));

describe('AuditQueueService', () => {
  const enqueue = jest.fn().mockResolvedValue('audit-job-id');
  const service = new AuditQueueService({
    enqueue,
  } as unknown as QueueService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds a unique event id and occurrence time before queuing', async () => {
    await service.enqueue({
      workspaceId: 'workspace-id',
      userId: 'user-id',
      action: 'task.created',
      entityType: 'task',
      entityId: 'task-id',
      oldData: null,
      newData: { title: 'Task' },
    });

    expect(enqueue).toHaveBeenCalledWith(
      QUEUE_NAMES.AUDIT_LOG,
      expect.objectContaining({
        eventId: expect.any(String),
        occurredAt: expect.any(String),
        workspaceId: 'workspace-id',
        userId: 'user-id',
        action: 'task.created',
        entityType: 'task',
        entityId: 'task-id',
        oldData: null,
        newData: { title: 'Task' },
      }),
    );
  });
});
