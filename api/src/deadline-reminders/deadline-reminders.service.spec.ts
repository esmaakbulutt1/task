import type { PoolClient } from 'pg';
import type { DbService } from '../database/db.service';
import type { MailQueueService } from '../mail/mail-queue.service';
import type { NotificationsService } from '../notifications/notifications.service';
import { DeadlineRemindersService } from './deadline-reminders.service';

jest.mock('pg-boss', () => ({ PgBoss: jest.fn() }));

describe('DeadlineRemindersService', () => {
  const dueDate = new Date('2026-08-15T09:00:00.000Z');
  const candidate = {
    taskId: 'task-id',
    userId: 'user-id',
    recipientEmail: 'user@example.com',
    taskTitle: 'Mail worker',
    dueDate,
    reminderType: 'approaching',
  };

  const query = jest.fn();
  const clientQuery = jest.fn();
  const release = jest.fn();
  const createNotification = jest.fn();
  const enqueueDeadlineEmail = jest.fn();
  const client = { query: clientQuery, release } as unknown as PoolClient;
  const dbService = {
    query,
    getClient: jest.fn().mockResolvedValue(client),
  } as unknown as DbService;
  const notificationsService = {
    create: createNotification,
  } as unknown as NotificationsService;
  const mailQueueService = {
    enqueueTaskDeadlineReminder: enqueueDeadlineEmail,
  } as unknown as MailQueueService;
  const service = new DeadlineRemindersService(
    dbService,
    notificationsService,
    mailQueueService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates one notification and one email job for a new reminder', async () => {
    query
      .mockResolvedValueOnce({ rows: [candidate] })
      .mockResolvedValueOnce({ rows: [{ id: 'reminder-id' }] });
    clientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: 'reminder-id', notificationId: null }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    createNotification.mockResolvedValue({ id: 'notification-id' });
    enqueueDeadlineEmail.mockResolvedValue('email-job-id');

    const result = await service.processDueTasks();

    expect(createNotification).toHaveBeenCalledWith(
      'user-id',
      'task_deadline_approaching',
      'Görevinizin son tarihi yaklaşıyor',
      '"Mail worker" görevinizin son tarihi 24 saat içinde dolacak.',
      client,
    );
    expect(enqueueDeadlineEmail).toHaveBeenCalledWith(
      'user@example.com',
      'Mail worker',
      dueDate,
      false,
      'reminder-id',
    );
    expect(result).toEqual({
      candidates: 1,
      processed: 1,
      skipped: 0,
      approaching: 1,
      overdue: 0,
    });
    expect(release).toHaveBeenCalled();
  });

  it('skips a reminder that is already completed or currently locked', async () => {
    query.mockResolvedValueOnce({ rows: [candidate] });
    clientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await service.processDueTasks();

    expect(createNotification).not.toHaveBeenCalled();
    expect(enqueueDeadlineEmail).not.toHaveBeenCalled();
    expect(result).toEqual({
      candidates: 1,
      processed: 0,
      skipped: 1,
      approaching: 0,
      overdue: 0,
    });
  });

  it('creates a separate overdue notification and email job', async () => {
    const overdueCandidate = {
      ...candidate,
      dueDate: new Date('2026-08-13T09:00:00.000Z'),
      reminderType: 'overdue',
    };
    query
      .mockResolvedValueOnce({ rows: [overdueCandidate] })
      .mockResolvedValueOnce({ rows: [{ id: 'reminder-id' }] });
    clientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: 'reminder-id', notificationId: null }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    createNotification.mockResolvedValue({ id: 'notification-id' });
    enqueueDeadlineEmail.mockResolvedValue('email-job-id');

    const result = await service.processDueTasks();

    expect(createNotification).toHaveBeenCalledWith(
      'user-id',
      'task_overdue',
      'Görevinizin son tarihi geçti',
      '"Mail worker" görevinizin son tarihi geçti.',
      client,
    );
    expect(enqueueDeadlineEmail).toHaveBeenCalledWith(
      'user@example.com',
      'Mail worker',
      overdueCandidate.dueDate,
      true,
      'reminder-id',
    );
    expect(result).toEqual({
      candidates: 1,
      processed: 1,
      skipped: 0,
      approaching: 0,
      overdue: 1,
    });
  });

  it('releases the reminder lock when queuing the email fails', async () => {
    query
      .mockResolvedValueOnce({ rows: [candidate] })
      .mockResolvedValueOnce({ rows: [] });
    clientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: 'reminder-id', notificationId: 'notification-id' }],
      })
      .mockResolvedValueOnce({ rows: [] });
    enqueueDeadlineEmail.mockRejectedValueOnce(new Error('Queue unavailable'));

    await expect(service.processDueTasks()).rejects.toThrow(
      'Queue unavailable',
    );

    expect(query).toHaveBeenLastCalledWith(
      expect.stringContaining('locked_at = NULL'),
      ['reminder-id'],
    );
  });
});
