import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DbService } from '../database/db.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { QueueService } from '../queue/queue.service';
import type { AuditLogJobData } from './audit-job.types';

@Injectable()
export class AuditWorker implements OnModuleInit {
  private readonly logger = new Logger(AuditWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly dbService: DbService,
  ) {}

  async onModuleInit(): Promise<void> {
    const workerId = await this.queueService.registerWorker<AuditLogJobData>(
      QUEUE_NAMES.AUDIT_LOG,
      async ([job]) => {
        if (!job) {
          return;
        }

        this.logger.log(`Audit job started: ${job.id}.`);
        await this.insertAuditLog(job.data);
        this.logger.log(`Audit job completed: ${job.id}.`);
      },
    );

    this.logger.log(`Audit worker started: ${workerId}.`);
  }

  private async insertAuditLog(data: AuditLogJobData): Promise<void> {
    await this.dbService.query(
      `
        INSERT INTO audit_logs (
          event_id,
          workspace_id,
          user_id,
          action,
          entity_type,
          entity_id,
          old_data,
          new_data,
          created_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7::jsonb,
          $8::jsonb,
          $9::timestamptz
        )
        ON CONFLICT (event_id) DO NOTHING
      `,
      [
        data.eventId,
        data.workspaceId,
        data.userId,
        data.action,
        data.entityType,
        data.entityId,
        data.oldData ? JSON.stringify(data.oldData) : null,
        data.newData ? JSON.stringify(data.newData) : null,
        data.occurredAt,
      ],
    );
  }
}
