import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { QueueService } from '../queue/queue.service';
import type { SendEmailJobData } from './mail-job.types';
import { MailService } from './mail.service';

@Injectable()
export class MailWorker implements OnModuleInit {
  private readonly logger = new Logger(MailWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly mailService: MailService,
  ) {}

  async onModuleInit(): Promise<void> {
    const workerId = await this.queueService.registerWorker<SendEmailJobData>(
      QUEUE_NAMES.SEND_EMAIL,
      async ([job]) => {
        if (!job) {
          return;
        }

        this.logger.log(`Email job started: ${job.id} (${job.data.type}).`);
        await this.handle(job.data);
        this.logger.log(`Email job completed: ${job.id} (${job.data.type}).`);
      },
    );

    this.logger.log(`Mail worker started: ${workerId}.`);
  }

  private async handle(data: SendEmailJobData): Promise<void> {
    switch (data.type) {
      case 'password-reset':
        await this.mailService.sendPasswordReset(
          data.recipientEmail,
          data.token,
        );
        return;

      case 'workspace-member-added':
        await this.mailService.sendWorkspaceMemberAdded(
          data.recipientEmail,
          data.workspaceName,
        );
        return;

      case 'task-assigned':
        await this.mailService.sendTaskAssigned(
          data.recipientEmail,
          data.workspaceName,
          data.projectName,
          data.taskTitle,
        );
        return;

      case 'task-deadline-reminder':
        await this.mailService.sendTaskDeadlineReminder(
          data.recipientEmail,
          data.taskTitle,
          data.dueDate,
          data.overdue,
        );
    }
  }
}
