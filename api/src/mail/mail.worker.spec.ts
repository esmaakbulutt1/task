import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../queue/queue.constants';
import type { QueueService } from '../queue/queue.service';
import type { SendEmailJobData } from './mail-job.types';
import type { MailService } from './mail.service';
import { MailWorker } from './mail.worker';

jest.mock('pg-boss', () => ({ PgBoss: jest.fn() }));

type TestJobHandler = (
  jobs: Array<{ id: string; data: SendEmailJobData }>,
) => Promise<unknown>;

describe('MailWorker', () => {
  let handler: TestJobHandler | undefined;

  const registerWorker = jest.fn(
    async (_queueName: string, registeredHandler: TestJobHandler) => {
      handler = registeredHandler;
      return 'mail-worker-id';
    },
  );
  const mailService = {
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    sendWorkspaceMemberAdded: jest.fn().mockResolvedValue(undefined),
    sendTaskAssigned: jest.fn().mockResolvedValue(undefined),
    sendTaskDeadlineReminder: jest.fn().mockResolvedValue(undefined),
  };
  const worker = new MailWorker(
    { registerWorker } as unknown as QueueService,
    mailService as unknown as MailService,
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

  it('registers on the send-email queue', () => {
    expect(registerWorker).toHaveBeenCalledWith(
      QUEUE_NAMES.SEND_EMAIL,
      expect.any(Function),
    );
  });

  it.each<{
    data: SendEmailJobData;
    method: keyof typeof mailService;
    args: unknown[];
  }>([
    {
      data: {
        type: 'password-reset',
        recipientEmail: 'user@example.com',
        token: 'token',
      },
      method: 'sendPasswordReset',
      args: ['user@example.com', 'token'],
    },
    {
      data: {
        type: 'workspace-member-added',
        recipientEmail: 'user@example.com',
        workspaceName: 'Taskflow',
      },
      method: 'sendWorkspaceMemberAdded',
      args: ['user@example.com', 'Taskflow'],
    },
    {
      data: {
        type: 'task-assigned',
        recipientEmail: 'user@example.com',
        workspaceName: 'Taskflow',
        projectName: 'API',
        taskTitle: 'Mail worker',
      },
      method: 'sendTaskAssigned',
      args: ['user@example.com', 'Taskflow', 'API', 'Mail worker'],
    },
    {
      data: {
        type: 'task-deadline-reminder',
        recipientEmail: 'user@example.com',
        taskTitle: 'Mail worker',
        dueDate: '2026-08-15T09:00:00.000Z',
        overdue: false,
      },
      method: 'sendTaskDeadlineReminder',
      args: [
        'user@example.com',
        'Mail worker',
        '2026-08-15T09:00:00.000Z',
        false,
      ],
    },
  ])('dispatches $data.type jobs', async ({ data, method, args }) => {
    expect(handler).toBeDefined();

    await handler?.([{ id: 'job-id', data }]);

    expect(mailService[method]).toHaveBeenCalledWith(...args);
  });
});
