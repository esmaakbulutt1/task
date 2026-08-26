import { Injectable, Logger } from '@nestjs/common';
import { DbService } from '../database/db.service';
import { MailQueueService } from '../mail/mail-queue.service';
import {
  NotificationsService,
  type NotificationType,
} from '../notifications/notifications.service';

type ReminderType = 'approaching' | 'overdue';

interface TaskDeadlineCandidate {
  taskId: string;
  userId: string;
  recipientEmail: string;
  taskTitle: string;
  dueDate: Date;
  reminderType: ReminderType;
}

interface ReminderClaimRow {
  id: string;
  notificationId: string | null;
}

export interface DeadlineReminderProcessResult {
  candidates: number;
  processed: number;
  skipped: number;
  approaching: number;
  overdue: number;
}

@Injectable()
export class DeadlineRemindersService {
  private readonly logger = new Logger(DeadlineRemindersService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly notificationsService: NotificationsService,
    private readonly mailQueueService: MailQueueService,
  ) {}

  async processDueTasks(): Promise<DeadlineReminderProcessResult> {
    const candidates = await this.findCandidates();
    const result: DeadlineReminderProcessResult = {
      candidates: candidates.length,
      processed: 0,
      skipped: 0,
      approaching: 0,
      overdue: 0,
    };

    for (const candidate of candidates) {
      const processed = await this.processCandidate(candidate);

      if (!processed) {
        result.skipped += 1;
        continue;
      }

      result.processed += 1;
      result[candidate.reminderType] += 1;
    }

    return result;
  }

  private async findCandidates(): Promise<TaskDeadlineCandidate[]> {
    const queryResult = await this.dbService.query<TaskDeadlineCandidate>(
      `
        SELECT
          t.id AS "taskId",
          t.assigned_to AS "userId",
          u.email AS "recipientEmail",
          t.title AS "taskTitle",
          t.due_date AS "dueDate",
          CASE
            WHEN t.due_date <= NOW() THEN 'overdue'
            ELSE 'approaching'
          END AS "reminderType"
        FROM tasks t
        INNER JOIN projects p
          ON p.id = t.project_id
        INNER JOIN workspaces w
          ON w.id = p.workspace_id
        INNER JOIN workspace_members wm
          ON wm.workspace_id = w.id
          AND wm.user_id = t.assigned_to
        INNER JOIN users u
          ON u.id = t.assigned_to
        WHERE
          t.deleted_at IS NULL
          AND t.status <> 'completed'
          AND t.assigned_to IS NOT NULL
          AND t.due_date IS NOT NULL
          AND t.due_date <= NOW() + INTERVAL '24 hours'
          AND p.deleted_at IS NULL
          AND w.deleted_at IS NULL
          AND u.is_active = TRUE
        ORDER BY t.due_date ASC, t.id ASC
      `,
    );

    return queryResult.rows;
  }

  private async processCandidate(
    candidate: TaskDeadlineCandidate,
  ): Promise<boolean> {
    const client = await this.dbService.getClient();
    let transactionStarted = false;
    let reminderId: string | null = null;

    try {
      await client.query('BEGIN');
      transactionStarted = true;

      const claimResult = await client.query<ReminderClaimRow>(
        `
          INSERT INTO task_deadline_reminders (
            task_id,
            user_id,
            reminder_type,
            due_date,
            locked_at
          )
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (task_id, user_id, reminder_type, due_date)
          DO UPDATE SET
            locked_at = NOW(),
            updated_at = NOW()
          WHERE
            task_deadline_reminders.completed_at IS NULL
            AND (
              task_deadline_reminders.locked_at IS NULL
              OR task_deadline_reminders.locked_at < NOW() - INTERVAL '15 minutes'
            )
          RETURNING
            id,
            notification_id AS "notificationId"
        `,
        [
          candidate.taskId,
          candidate.userId,
          candidate.reminderType,
          candidate.dueDate,
        ],
      );
      const reminder = claimResult.rows[0];

      if (!reminder) {
        await client.query('COMMIT');
        transactionStarted = false;
        return false;
      }

      reminderId = reminder.id;

      if (!reminder.notificationId) {
        const notification = await this.notificationsService.create(
          candidate.userId,
          this.getNotificationType(candidate.reminderType),
          this.getNotificationTitle(candidate.reminderType),
          this.getNotificationMessage(candidate),
          client,
        );

        await client.query(
          `
            UPDATE task_deadline_reminders
            SET notification_id = $2, updated_at = NOW()
            WHERE id = $1
          `,
          [reminder.id, notification.id],
        );
      }

      await client.query('COMMIT');
      transactionStarted = false;

      const emailJobId =
        await this.mailQueueService.enqueueTaskDeadlineReminder(
          candidate.recipientEmail,
          candidate.taskTitle,
          candidate.dueDate,
          candidate.reminderType === 'overdue',
          reminder.id,
        );

      const completionResult = await this.dbService.query<{ id: string }>(
        `
          UPDATE task_deadline_reminders
          SET
            email_job_id = $2,
            email_queued_at = NOW(),
            completed_at = NOW(),
            locked_at = NULL,
            updated_at = NOW()
          WHERE id = $1 AND completed_at IS NULL
          RETURNING id
        `,
        [reminder.id, emailJobId],
      );

      if (!completionResult.rows[0]) {
        throw new Error('Deadline reminder could not be marked as completed.');
      }

      return true;
    } catch (error: unknown) {
      if (transactionStarted) {
        await client.query('ROLLBACK');
      } else if (reminderId) {
        await this.releaseReminderLock(reminderId);
      }

      throw error;
    } finally {
      client.release();
    }
  }

  private async releaseReminderLock(reminderId: string): Promise<void> {
    try {
      await this.dbService.query(
        `
          UPDATE task_deadline_reminders
          SET locked_at = NULL, updated_at = NOW()
          WHERE id = $1 AND completed_at IS NULL
        `,
        [reminderId],
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          'Deadline reminder lock could not be released.',
          error.stack,
        );
      } else {
        this.logger.error('Deadline reminder lock could not be released.');
      }
    }
  }

  private getNotificationType(reminderType: ReminderType): NotificationType {
    return reminderType === 'overdue'
      ? 'task_overdue'
      : 'task_deadline_approaching';
  }

  private getNotificationTitle(reminderType: ReminderType): string {
    return reminderType === 'overdue'
      ? 'Görevinizin son tarihi geçti'
      : 'Görevinizin son tarihi yaklaşıyor';
  }

  private getNotificationMessage(candidate: TaskDeadlineCandidate): string {
    return candidate.reminderType === 'overdue'
      ? `"${candidate.taskTitle}" görevinizin son tarihi geçti.`
      : `"${candidate.taskTitle}" görevinizin son tarihi 24 saat içinde dolacak.`;
  }
}
