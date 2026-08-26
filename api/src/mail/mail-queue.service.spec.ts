import { QUEUE_NAMES } from '../queue/queue.constants';
import type { QueueService } from '../queue/queue.service';
import { MailQueueService } from './mail-queue.service';

jest.mock('pg-boss', () => ({ PgBoss: jest.fn() }));

describe('MailQueueService', () => {
  const enqueue = jest.fn().mockResolvedValue('job-id');
  const queueService = { enqueue } as unknown as QueueService;
  const service = new MailQueueService(queueService);

  beforeEach(() => {
    enqueue.mockClear();
  });

  it('queues a password reset email with token-safe retention', async () => {
    await service.enqueuePasswordReset('user@example.com', 'reset-token');

    expect(enqueue).toHaveBeenCalledWith(
      QUEUE_NAMES.SEND_EMAIL,
      {
        type: 'password-reset',
        recipientEmail: 'user@example.com',
        token: 'reset-token',
      },
      {
        retentionSeconds: 15 * 60,
        deleteAfterSeconds: 15 * 60,
      },
    );
  });

  it('queues workspace, task and deadline emails', async () => {
    await service.enqueueWorkspaceMemberAdded('member@example.com', 'Taskflow');
    await service.enqueueTaskAssigned(
      'member@example.com',
      'Taskflow',
      'API',
      'Mail worker',
    );

    const dueDate = new Date('2026-08-15T09:00:00.000Z');
    await service.enqueueTaskDeadlineReminder(
      'member@example.com',
      'Mail worker',
      dueDate,
      false,
    );

    expect(enqueue).toHaveBeenNthCalledWith(
      1,
      QUEUE_NAMES.SEND_EMAIL,
      {
        type: 'workspace-member-added',
        recipientEmail: 'member@example.com',
        workspaceName: 'Taskflow',
      },
      undefined,
    );
    expect(enqueue).toHaveBeenNthCalledWith(
      2,
      QUEUE_NAMES.SEND_EMAIL,
      {
        type: 'task-assigned',
        recipientEmail: 'member@example.com',
        workspaceName: 'Taskflow',
        projectName: 'API',
        taskTitle: 'Mail worker',
      },
      undefined,
    );
    expect(enqueue).toHaveBeenNthCalledWith(
      3,
      QUEUE_NAMES.SEND_EMAIL,
      {
        type: 'task-deadline-reminder',
        recipientEmail: 'member@example.com',
        taskTitle: 'Mail worker',
        dueDate: dueDate.toISOString(),
        overdue: false,
      },
      undefined,
    );
  });
});
