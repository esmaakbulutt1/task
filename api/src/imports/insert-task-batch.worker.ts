import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { QueueService } from '../queue/queue.service';
import type { InsertTaskBatchJobData } from './import-job.types';
import { ImportWorkersService } from './import-workers.service';

@Injectable()
export class InsertTaskBatchWorker implements OnModuleInit {
  private readonly logger = new Logger(InsertTaskBatchWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly importWorkersService: ImportWorkersService,
  ) {}

  async onModuleInit(): Promise<void> {
    const workerId =
      await this.queueService.registerWorker<InsertTaskBatchJobData>(
        QUEUE_NAMES.INSERT_TASK_BATCH,
        async ([job]) => {
          if (!job) {
            return;
          }

          this.logger.log(`Task batch job started: ${job.id}.`);
          const inserted = await this.importWorkersService.insertBatch(
            job.data,
          );
          this.logger.log(
            `Task batch job completed: ${job.id}, ${inserted} tasks inserted.`,
          );
        },
      );

    this.logger.log(`Task batch worker started: ${workerId}.`);
  }
}
