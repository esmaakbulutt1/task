import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { DatabaseModule } from './database/database.module';
import { DeadlineRemindersModule } from './deadline-reminders/deadline-reminders.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ImportsModule } from './imports/imports.module';
import { MailModule } from './mail/mail.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { WorkspaceMembersModule } from './workspace-members/workspace-members.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { CommentsModule } from './comments/comments.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { QueueModule } from './queue/queue.module';
import { RedisModule, RedisToken } from '@nestjs-redis/client';
import { RedisThrottlerStorage } from '@nestjs-redis/throttler-storage';
import type { RedisClientType } from 'redis';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    RedisModule.forRootAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        options: {
          url: configService.getOrThrow<string>('REDIS_URL'),
          name: 'taskflow-api',
        },
      }),
    }),
    AuditModule,
    DatabaseModule,
    DeadlineRemindersModule,
    DashboardModule,
    ImportsModule,
    AuthModule,
    AuthorizationModule,
    MailModule,
    ProjectsModule,
    TasksModule,
    WorkspacesModule,
    WorkspaceMembersModule,
    CommentsModule,
    AttachmentsModule,
    NotificationsModule,
    QueueModule,
    ThrottlerModule.forRootAsync({
      inject: [RedisToken()],
      useFactory: (redis: RedisClientType) => ({
        throttlers: [
          {
            ttl: 60_000,
            limit: 120,
          },
        ],
        storage: new RedisThrottlerStorage(redis),
      }),
    }),
    SearchModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
