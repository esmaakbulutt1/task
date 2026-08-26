import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { QueueService } from '../queue/queue.service';
import { DeadlineRemindersService } from './deadline-reminders.service';

interface DeadlineReminderJobData {
  source: 'daily-schedule';
}

const DEADLINE_REMINDER_CRON = '0 9 * * *';
const DEADLINE_REMINDER_SCHEDULE_KEY = 'daily-deadline-reminders';

@Injectable()
export class DeadlineReminderWorker implements OnModuleInit {
  private readonly logger = new Logger(DeadlineReminderWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly deadlineRemindersService: DeadlineRemindersService,
  ) {}

  async onModuleInit(): Promise<void> {
    const workerId =
      await this.queueService.registerWorker<DeadlineReminderJobData>(
        QUEUE_NAMES.TASK_DEADLINE_REMINDER,
        async ([job]) => {
          if (!job) {
            return;
          }

          this.logger.log(`Deadline reminder job started: ${job.id}.`);
          const result = await this.deadlineRemindersService.processDueTasks();

          this.logger.log(
            `Deadline reminder job completed: ${result.processed} processed, ${result.skipped} skipped.`,
          );
        },
      );

    await this.queueService.schedule(
      QUEUE_NAMES.TASK_DEADLINE_REMINDER,
      DEADLINE_REMINDER_CRON,
      { source: 'daily-schedule' },
      {
        key: DEADLINE_REMINDER_SCHEDULE_KEY,
        tz: 'Europe/Istanbul',
      },
    );

    this.logger.log(`Deadline reminder worker started: ${workerId}.`);
  }
}
