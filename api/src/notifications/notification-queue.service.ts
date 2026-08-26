import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { QueueService } from '../queue/queue.service';
import type { NotificationCreatedJobData } from './notification-job.types';
import type { NotificationType } from './notifications.service';

@Injectable()
export class NotificationQueueService {
  constructor(private readonly queueService: QueueService) {}

  async enqueue(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
  ): Promise<string | null> {
    const data: NotificationCreatedJobData = {
      eventId: randomUUID(),
      userId,
      type,
      title,
      message,
    };

    return this.queueService.enqueue(QUEUE_NAMES.NOTIFICATION_CREATED, data);
  }
}
