import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PgBoss } from 'pg-boss';
import type {
  Job,
  JobWithMetadata,
  ScheduleOptions,
  SendOptions,
  WorkOptions,
} from 'pg-boss';
import {
  DEFAULT_WORK_OPTIONS,
  QUEUE_NAMES,
  QUEUE_OPTIONS,
} from './queue.constants';
import type { QueueName } from './queue.constants';

type QueueWorkHandler<T extends object> = (jobs: Job<T>[]) => Promise<unknown>;

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly boss: PgBoss;

  constructor() {
    const port = Number(this.getRequiredEnv('DATABASE_PORT'));

    if (!Number.isInteger(port) || port <= 0) {
      throw new Error('DATABASE_PORT must be a positive integer.');
    }

    this.boss = new PgBoss({
      host: this.getRequiredEnv('DATABASE_HOST'),
      port,
      user: this.getRequiredEnv('POSTGRES_USER'),
      password: this.getRequiredEnv('POSTGRES_PASSWORD'),
      database: this.getRequiredEnv('POSTGRES_DB'),
    });

    this.boss.on('error', (error: Error) => {
      this.logger.error('pg-boss error.', error.stack);
    });

    this.boss.on('warning', (warning) => {
      this.logger.warn(`pg-boss warning: ${warning.message}`);
    });
  }

  async onModuleInit(): Promise<void> {
    await this.boss.start();

    for (const queueName of Object.values(QUEUE_NAMES)) {
      await this.boss.createQueue(queueName, QUEUE_OPTIONS[queueName]);
    }

    this.logger.log('pg-boss started and queues are ready.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.boss.stop();
    this.logger.log('pg-boss stopped.');
  }

  async enqueue<T extends object>(
    queueName: QueueName,
    data: T,
    options?: SendOptions,
  ): Promise<string | null> {
    return this.boss.send(queueName, data, options);
  }

  async registerWorker<T extends object>(
    queueName: QueueName,
    handler: QueueWorkHandler<T>,
    options: WorkOptions = {},
  ): Promise<string> {
    return this.boss.work<T, unknown>(
      queueName,
      { ...DEFAULT_WORK_OPTIONS, ...options, includeMetadata: true },
      async (jobs) => {
        const jobsWithMetadata = jobs as JobWithMetadata<T>[];

        for (const job of jobsWithMetadata) {
          if (job.retryCount > 0) {
            this.logger.warn(
              `Retrying job ${job.id} from ${queueName}; attempt ${job.retryCount + 1} of ${job.retryLimit + 1}.`,
            );
          }
        }

        return handler(jobsWithMetadata);
      },
    );
  }

  async schedule<T extends object>(
    queueName: QueueName,
    cron: string,
    data: T,
    options?: ScheduleOptions,
  ): Promise<void> {
    await this.boss.schedule(queueName, cron, data, options);
  }

  async unschedule(queueName: QueueName, key?: string): Promise<void> {
    await this.boss.unschedule(queueName, key);
  }

  private getRequiredEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
  }
}
