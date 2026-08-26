import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../queue/queue.constants';
import type { QueueService } from '../queue/queue.service';
import type { DeadlineRemindersService } from './deadline-reminders.service';
import { DeadlineReminderWorker } from './deadline-reminder.worker';

jest.mock('pg-boss', () => ({ PgBoss: jest.fn() }));

type TestJobHandler = (
  jobs: Array<{ id: string; data: object }>,
) => Promise<unknown>;

describe('DeadlineReminderWorker', () => {
  let handler: TestJobHandler | undefined;

  const registerWorker = jest.fn(
    async (_queueName: string, registeredHandler: TestJobHandler) => {
      handler = registeredHandler;
      return 'deadline-worker-id';
    },
  );
  const schedule = jest.fn().mockResolvedValue(undefined);
  const processDueTasks = jest.fn().mockResolvedValue({
    candidates: 1,
    processed: 1,
    skipped: 0,
    approaching: 1,
    overdue: 0,
  });
  const worker = new DeadlineReminderWorker(
    { registerWorker, schedule } as unknown as QueueService,
    { processDueTasks } as unknown as DeadlineRemindersService,
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

  it('registers the worker and daily Istanbul schedule', () => {
    expect(registerWorker).toHaveBeenCalledWith(
      QUEUE_NAMES.TASK_DEADLINE_REMINDER,
      expect.any(Function),
    );
    expect(schedule).toHaveBeenCalledWith(
      QUEUE_NAMES.TASK_DEADLINE_REMINDER,
      '0 9 * * *',
      { source: 'daily-schedule' },
      {
        key: 'daily-deadline-reminders',
        tz: 'Europe/Istanbul',
      },
    );
  });

  it('processes due tasks when a scheduled job arrives', async () => {
    expect(handler).toBeDefined();

    await handler?.([{ id: 'job-id', data: { source: 'daily-schedule' } }]);

    expect(processDueTasks).toHaveBeenCalledTimes(1);
  });
});
