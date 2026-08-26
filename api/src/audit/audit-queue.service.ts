import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { QueueService } from '../queue/queue.service';
import type { AuditLogJobData, EnqueueAuditLogData } from './audit-job.types';

@Injectable()
export class AuditQueueService {
  constructor(private readonly queueService: QueueService) {}

  async enqueue(data: EnqueueAuditLogData): Promise<string | null> {
    const jobData: AuditLogJobData = {
      ...data,
      eventId: randomUUID(),
      occurredAt: new Date().toISOString(),
    };

    return this.queueService.enqueue(QUEUE_NAMES.AUDIT_LOG, jobData);
  }
}
