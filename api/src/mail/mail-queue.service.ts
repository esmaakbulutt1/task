import { Injectable } from '@nestjs/common';
import type { SendOptions } from 'pg-boss';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { QueueService } from '../queue/queue.service';
import type { SendEmailJobData } from './mail-job.types';

@Injectable()
export class MailQueueService {
  constructor(private readonly queueService: QueueService) {}

  async enqueuePasswordReset(
    recipientEmail: string,
    token: string,
  ): Promise<string | null> {
    return this.enqueue(
      {
        type: 'password-reset',
        recipientEmail,
        token,
      },
      {
        retentionSeconds: 15 * 60,
        deleteAfterSeconds: 15 * 60,
      },
    );
  }

  async enqueueWorkspaceMemberAdded(
    recipientEmail: string,
    workspaceName: string,
  ): Promise<string | null> {
    return this.enqueue({
      type: 'workspace-member-added',
      recipientEmail,
      workspaceName,
    });
  }

  async enqueueTaskAssigned(
    recipientEmail: string,
    workspaceName: string,
    projectName: string,
    taskTitle: string,
  ): Promise<string | null> {
    return this.enqueue({
      type: 'task-assigned',
      recipientEmail,
      workspaceName,
      projectName,
      taskTitle,
    });
  }

  async enqueueTaskDeadlineReminder(
    recipientEmail: string,
    taskTitle: string,
    dueDate: Date,
    overdue: boolean,
    deduplicationKey?: string,
  ): Promise<string | null> {
    return this.enqueue(
      {
        type: 'task-deadline-reminder',
        recipientEmail,
        taskTitle,
        dueDate: dueDate.toISOString(),
        overdue,
      },
      deduplicationKey
        ? {
            singletonKey: deduplicationKey,
            singletonSeconds: 7 * 24 * 60 * 60,
          }
        : undefined,
    );
  }

  private async enqueue(
    data: SendEmailJobData,
    options?: SendOptions,
  ): Promise<string | null> {
    return this.queueService.enqueue(QUEUE_NAMES.SEND_EMAIL, data, options);
  }
}
