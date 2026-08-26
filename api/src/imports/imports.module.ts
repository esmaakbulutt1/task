import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { DatabaseModule } from '../database/database.module';
import { QueueModule } from '../queue/queue.module';
import { ImportWorkersService } from './import-workers.service';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { InsertTaskBatchWorker } from './insert-task-batch.worker';
import { ParseTaskCsvWorker } from './parse-task-csv.worker';

@Module({
  imports: [
    DatabaseModule,
    QueueModule,
    AuthModule,
    AuthorizationModule,
    AuditModule,
  ],
  controllers: [ImportsController],
  providers: [
    ImportsService,
    ImportWorkersService,
    ParseTaskCsvWorker,
    InsertTaskBatchWorker,
  ],
})
export class ImportsModule {}
