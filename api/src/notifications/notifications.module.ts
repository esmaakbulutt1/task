import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { QueueModule } from '../queue/queue.module';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationWorker } from './notification.worker';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [AuthModule, DatabaseModule, QueueModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationQueueService,
    NotificationWorker,
  ],
  exports: [NotificationsService, NotificationQueueService],
})
export class NotificationsModule {}
