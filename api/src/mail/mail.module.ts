import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { MailQueueService } from './mail-queue.service';
import { MailService } from './mail.service';
import { MailWorker } from './mail.worker';

@Module({
  imports: [QueueModule],
  providers: [MailService, MailQueueService, MailWorker],
  exports: [MailQueueService],
})
export class MailModule {}
