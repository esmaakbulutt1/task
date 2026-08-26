import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { QueueService } from '../queue/queue.service';
import type { ParseTaskCsvJobData } from './import-job.types';
import { ImportWorkersService } from './import-workers.service';

@Injectable()
export class ParseTaskCsvWorker implements OnModuleInit {
  private readonly logger = new Logger(ParseTaskCsvWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly importWorkersService: ImportWorkersService,
  ) {}

  async onModuleInit(): Promise<void> {
    const workerId =
      await this.queueService.registerWorker<ParseTaskCsvJobData>(
        QUEUE_NAMES.PARSE_TASK_CSV,
        async ([job]) => {
          if (!job) {
            return;
          }

          this.logger.log(`CSV parse job started: ${job.id}.`);
          await this.importWorkersService.parseImport(job.data.importJobId);
          this.logger.log(`CSV parse job completed: ${job.id}.`);
        },
      );

    this.logger.log(`CSV parse worker started: ${workerId}.`);
  }
}
