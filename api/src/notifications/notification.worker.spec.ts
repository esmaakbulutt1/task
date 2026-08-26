import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../queue/queue.constants';
import type { QueueService } from '../queue/queue.service';
import type { NotificationCreatedJobData } from './notification-job.types';
import { NotificationWorker } from './notification.worker';
import type { NotificationsService } from './notifications.service';

jest.mock('pg-boss', () => ({ PgBoss: jest.fn() }));

type TestJobHandler = (
  jobs: Array<{ id: string; data: NotificationCreatedJobData }>,
) => Promise<unknown>;

describe('NotificationWorker', () => {
  let handler: TestJobHandler | undefined;

  const registerWorker = jest.fn(
    async (_queueName: string, registeredHandler: TestJobHandler) => {
      handler = registeredHandler;
      return 'notification-worker-id';
    },
  );
  const create = jest.fn().mockResolvedValue({ id: 'notification-id' });
  const worker = new NotificationWorker(
    { registerWorker } as unknown as QueueService,
    { create } as unknown as NotificationsService,
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

  it('registers on the notification queue and stores the queued notification', async () => {
    expect(registerWorker).toHaveBeenCalledWith(
      QUEUE_NAMES.NOTIFICATION_CREATED,
      expect.any(Function),
    );
    expect(handler).toBeDefined();

    await handler?.([
      {
        id: 'job-id',
        data: {
          eventId: 'event-id',
          userId: 'user-id',
          type: 'task_assigned',
          title: 'Yeni görev',
          message: 'Size yeni bir görev atandı.',
        },
      },
    ]);

    expect(create).toHaveBeenCalledWith(
      'user-id',
      'task_assigned',
      'Yeni görev',
      'Size yeni bir görev atandı.',
      undefined,
      'event-id',
    );
  });
});
