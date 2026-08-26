import { QUEUE_NAMES } from '../queue/queue.constants';
import type { QueueService } from '../queue/queue.service';
import { NotificationQueueService } from './notification-queue.service';

jest.mock('pg-boss', () => ({ PgBoss: jest.fn() }));

describe('NotificationQueueService', () => {
  const enqueue = jest.fn().mockResolvedValue('notification-job-id');
  const service = new NotificationQueueService({
    enqueue,
  } as unknown as QueueService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds a unique event id before queuing a notification', async () => {
    await service.enqueue(
      'user-id',
      'task_assigned',
      'Yeni görev',
      'Size yeni bir görev atandı.',
    );

    expect(enqueue).toHaveBeenCalledWith(
      QUEUE_NAMES.NOTIFICATION_CREATED,
      expect.objectContaining({
        eventId: expect.any(String),
        userId: 'user-id',
        type: 'task_assigned',
        title: 'Yeni görev',
        message: 'Size yeni bir görev atandı.',
      }),
    );
  });
});
