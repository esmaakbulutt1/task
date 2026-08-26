import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { QueueService } from '../queue/queue.service';
import type { NotificationCreatedJobData } from './notification-job.types';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationWorker implements OnModuleInit {
  private readonly logger = new Logger(NotificationWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const workerId =
      await this.queueService.registerWorker<NotificationCreatedJobData>(
        QUEUE_NAMES.NOTIFICATION_CREATED,
        async ([job]) => {
          if (!job) {
            return;
          }

          const data = job.data;

          this.logger.log(`Notification job started: ${job.id}.`);
          await this.notificationsService.create(
            data.userId,
            data.type,
            data.title,
            data.message,
            undefined,
            data.eventId,
          );
          this.logger.log(`Notification job completed: ${job.id}.`);
        },
      );

    this.logger.log(`Notification worker started: ${workerId}.`);
  }
}
