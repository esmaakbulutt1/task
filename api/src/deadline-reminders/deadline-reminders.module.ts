import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { QueueModule } from '../queue/queue.module';
import { DeadlineReminderWorker } from './deadline-reminder.worker';
import { DeadlineRemindersService } from './deadline-reminders.service';

@Module({
  imports: [DatabaseModule, QueueModule, NotificationsModule, MailModule],
  providers: [DeadlineRemindersService, DeadlineReminderWorker],
})
export class DeadlineRemindersModule {}
