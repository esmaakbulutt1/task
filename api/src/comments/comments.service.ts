import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from '../database/db.service';
import { NotificationQueueService } from '../notifications/notification-queue.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import type { UpdateCommentDto } from './dto/update-comment.dto';

export interface CommentRow {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface TaskRow {
  id: string;
  title: string;
  assignedTo: string | null;
}

interface CommentOwnerRow {
  userId: string;
}

@Injectable()
export class CommentsService {
  constructor(
    private readonly dbService: DbService,
    private readonly notificationQueueService: NotificationQueueService,
  ) {}

  async create(
    taskId: string,
    createdByUserId: string,
    body: CreateCommentDto,
  ): Promise<CommentRow> {
    const task = await this.assertTaskExists(taskId);

    const commentResult = await this.dbService.query<CommentRow>(
      `
        INSERT INTO comments (
          task_id,
          user_id,
          content
        )
        VALUES ($1, $2, $3)
        RETURNING
          id,
          task_id AS "taskId",
          user_id AS "userId",
          content,
          created_at AS "createdAt",
          updated_at AS "updatedAt",
          deleted_at AS "deletedAt"
      `,
      [taskId, createdByUserId, body.content],
    );

    const comment = commentResult.rows[0];

    if (task.assignedTo && task.assignedTo !== createdByUserId) {
      await this.notificationQueueService.enqueue(
        task.assignedTo,
        'task_commented',
        'Görevinize yorum yapıldı',
        `"${task.title}" görevine yeni bir yorum eklendi.`,
      );
    }

    return comment;
  }

  async findAll(taskId: string): Promise<CommentRow[]> {
    await this.assertTaskExists(taskId);

    const result = await this.dbService.query<CommentRow>(
      `
        SELECT
          id,
          task_id AS "taskId",
          user_id AS "userId",
          content,
          created_at AS "createdAt",
          updated_at AS "updatedAt",
          deleted_at AS "deletedAt"
        FROM comments
        WHERE task_id = $1
          AND deleted_at IS NULL
        ORDER BY created_at ASC
      `,
      [taskId],
    );

    return result.rows;
  }

  async findOne(commentId: string): Promise<CommentRow> {
    const result = await this.dbService.query<CommentRow>(
      `
        SELECT
          id,
          task_id AS "taskId",
          user_id AS "userId",
          content,
          created_at AS "createdAt",
          updated_at AS "updatedAt",
          deleted_at AS "deletedAt"
        FROM comments
        WHERE id = $1 AND deleted_at IS NULL
      `,
      [commentId],
    );
    const comment = result.rows[0];

    if (!comment) {
      throw new NotFoundException('Yorum bulunamadı.');
    }

    return comment;
  }

  async update(
    commentId: string,
    requestingUserId: string,
    body: UpdateCommentDto,
  ): Promise<CommentRow> {
    if (body.content === undefined) {
      throw new BadRequestException('Güncellenecek bir alan gönderilmelidir.');
    }

    const existingCommentResult = await this.dbService.query<CommentOwnerRow>(
      `
          SELECT user_id AS "userId"
          FROM comments
          WHERE id = $1 AND deleted_at IS NULL
        `,
      [commentId],
    );
    const existingComment = existingCommentResult.rows[0];

    if (!existingComment) {
      throw new NotFoundException('Yorum bulunamadı.');
    }

    if (existingComment.userId !== requestingUserId) {
      throw new ForbiddenException(
        'Yalnızca kendi yorumunuzu düzenleyebilirsiniz.',
      );
    }

    const result = await this.dbService.query<CommentRow>(
      `
        UPDATE comments
        SET
          content = $1,
          updated_at = NOW()
        WHERE id = $2 AND deleted_at IS NULL
        RETURNING
          id,
          task_id AS "taskId",
          user_id AS "userId",
          content,
          created_at AS "createdAt",
          updated_at AS "updatedAt",
          deleted_at AS "deletedAt"
      `,
      [body.content, commentId],
    );
    const comment = result.rows[0];

    if (!comment) {
      throw new NotFoundException('Yorum bulunamadı.');
    }

    return comment;
  }

  async remove(commentId: string): Promise<{ message: string }> {
    const result = await this.dbService.query<{ id: string }>(
      `
        UPDATE comments
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id
      `,
      [commentId],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('Yorum bulunamadı.');
    }

    return { message: 'Yorum silindi.' };
  }

  private async assertTaskExists(taskId: string): Promise<TaskRow> {
    const result = await this.dbService.query<TaskRow>(
      `
        SELECT
          id,
          title,
          assigned_to AS "assignedTo"
        FROM tasks
        WHERE id = $1 AND deleted_at IS NULL
      `,
      [taskId],
    );

    const task = result.rows[0];

    if (!task) {
      throw new NotFoundException('Görev bulunamadı.');
    }

    return task;
  }
}
