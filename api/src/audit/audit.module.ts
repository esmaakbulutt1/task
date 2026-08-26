import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { QueueModule } from '../queue/queue.module';
import { AuditQueueService } from './audit-queue.service';
import { AuditWorker } from './audit.worker';

@Module({
  imports: [DatabaseModule, QueueModule],
  providers: [AuditQueueService, AuditWorker],
  exports: [AuditQueueService],
})
export class AuditModule {}
