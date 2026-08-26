import { BadRequestException } from '@nestjs/common';
import type { AuditQueueService } from '../audit/audit-queue.service';
import type { DbService } from '../database/db.service';
import type { MailQueueService } from '../mail/mail-queue.service';
import type { NotificationQueueService } from '../notifications/notification-queue.service';
import { TasksService } from './tasks.service';

jest.mock('pg-boss', () => ({ PgBoss: jest.fn() }));

describe('TasksService', () => {
  const query = jest.fn().mockResolvedValue({ rows: [] });
  const notificationQueueService = { enqueue: jest.fn() };
  const mailQueueService = { enqueueTaskAssigned: jest.fn() };
  const auditQueueService = { enqueue: jest.fn() };
  const service = new TasksService(
    { query } as unknown as DbService,
    notificationQueueService as unknown as NotificationQueueService,
    mailQueueService as unknown as MailQueueService,
    auditQueueService as unknown as AuditQueueService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    query.mockResolvedValue({ rows: [] });
  });

  it('rejects an assignee who is not an active member of the project workspace', async () => {
    await expect(
      service.create('project-id', 'creator-id', {
        title: 'API geliştir',
        assignedTo: '37bcecef-44e1-4c46-8b51-17a65fc77adf',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('wm.user_id = $2'),
      ['project-id', '37bcecef-44e1-4c46-8b51-17a65fc77adf'],
    );
    expect(notificationQueueService.enqueue).not.toHaveBeenCalled();
    expect(mailQueueService.enqueueTaskAssigned).not.toHaveBeenCalled();
    expect(auditQueueService.enqueue).not.toHaveBeenCalled();
  });
});
