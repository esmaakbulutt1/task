import { Injectable, NotFoundException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DbService } from '../database/db.service';
import type { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';

export interface NotificationRow {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export interface PaginatedNotifications {
  data: NotificationRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  unreadCount: number;
}

interface CountRow {
  total: string;
}

export type NotificationType =
  | 'workspace_member_added'
  | 'task_assigned'
  | 'task_commented'
  | 'task_deadline_approaching'
  | 'task_overdue'
  | 'project_completed';

@Injectable()
export class NotificationsService {
  constructor(private readonly dbService: DbService) {}

  async findAll(
    userId: string,
    query: ListNotificationsQueryDto,
  ): Promise<PaginatedNotifications> {
    const offset = (query.page - 1) * query.limit;

    const [totalResult, unreadResult, notificationsResult] = await Promise.all([
      this.dbService.query<CountRow>(
        `
          SELECT COUNT(*) AS total
          FROM notifications
          WHERE user_id = $1
        `,
        [userId],
      ),
      this.dbService.query<CountRow>(
        `
          SELECT COUNT(*) AS total
          FROM notifications
          WHERE user_id = $1 AND is_read = FALSE
        `,
        [userId],
      ),
      this.dbService.query<NotificationRow>(
        `
          SELECT
            id,
            user_id AS "userId",
            type,
            title,
            message,
            is_read AS "isRead",
            created_at AS "createdAt"
          FROM notifications
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT $2
          OFFSET $3
        `,
        [userId, query.limit, offset],
      ),
    ]);

    const total = Number(totalResult.rows[0]?.total ?? 0);
    const unreadCount = Number(unreadResult.rows[0]?.total ?? 0);

    return {
      data: notificationsResult.rows,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
      unreadCount,
    };
  }

  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<NotificationRow> {
    const result = await this.dbService.query<NotificationRow>(
      `
        UPDATE notifications
        SET is_read = TRUE
        WHERE id = $1
          AND user_id = $2
        RETURNING
          id,
          user_id AS "userId",
          type,
          title,
          message,
          is_read AS "isRead",
          created_at AS "createdAt"
      `,
      [notificationId, userId],
    );
    const notification = result.rows[0];

    if (!notification) {
      throw new NotFoundException('Bildirim bulunamadı.');
    }

    return notification;
  }

  async markAllAsRead(userId: string): Promise<{ message: string }> {
    await this.dbService.query(
      `
        UPDATE notifications
        SET is_read = TRUE
        WHERE user_id = $1
          AND is_read = FALSE
      `,
      [userId],
    );

    return {
      message: 'Tüm bildirimler okundu olarak işaretlendi.',
    };
  }
  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    client?: PoolClient,
    eventId?: string,
  ): Promise<NotificationRow> {
    const sql = `
        INSERT INTO notifications (
          event_id,
          user_id,
          type,
          title,
          message
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (event_id) DO UPDATE
        SET event_id = EXCLUDED.event_id
        RETURNING
          id,
          user_id AS "userId",
          type,
          title,
          message,
          is_read AS "isRead",
          created_at AS "createdAt"
      `;
    const params = [eventId ?? null, userId, type, title, message];
    const result = client
      ? await client.query<NotificationRow>(sql, params)
      : await this.dbService.query<NotificationRow>(sql, params);

    return result.rows[0];
  }
}
