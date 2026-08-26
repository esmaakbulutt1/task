import { Injectable, NotFoundException } from '@nestjs/common';
import { unlink } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { DbService } from '../database/db.service';

export interface AttachmentRow {
  id: string;
  taskId: string;
  uploadedBy: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

export interface AttachmentFile {
  originalname: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
}

interface TaskRow {
  id: string;
}

interface StoredAttachmentRow {
  id: string;
  storedName: string;
}

@Injectable()
export class AttachmentsService {
  constructor(private readonly dbService: DbService) {}

  async create(
    taskId: string,
    uploadedByUserId: string,
    file: AttachmentFile,
  ): Promise<AttachmentRow> {
    await this.assertTaskExists(taskId);

    const attachmentResult = await this.dbService.query<AttachmentRow>(
      `
        INSERT INTO attachments (
          task_id,
          uploaded_by,
          original_name,
          stored_name,
          mime_type,
          size
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          id,
          task_id AS "taskId",
          uploaded_by AS "uploadedBy",
          original_name AS "originalName",
          stored_name AS "storedName",
          mime_type AS "mimeType",
          size,
          created_at AS "createdAt"
      `,
      [
        taskId,
        uploadedByUserId,
        file.originalname,
        file.filename,
        file.mimetype,
        file.size,
      ],
    );

    return attachmentResult.rows[0];
  }

  async findAll(taskId: string): Promise<AttachmentRow[]> {
    await this.assertTaskExists(taskId);

    const result = await this.dbService.query<AttachmentRow>(
      `
        SELECT
          id,
          task_id AS "taskId",
          uploaded_by AS "uploadedBy",
          original_name AS "originalName",
          stored_name AS "storedName",
          mime_type AS "mimeType",
          size,
          created_at AS "createdAt"
        FROM attachments
        WHERE task_id = $1
        ORDER BY created_at ASC
      `,
      [taskId],
    );

    return result.rows;
  }

  async remove(attachmentId: string): Promise<{ message: string }> {
    const attachmentResult = await this.dbService.query<StoredAttachmentRow>(
      `
          SELECT
            id,
            stored_name AS "storedName"
          FROM attachments
          WHERE id = $1
        `,
      [attachmentId],
    );
    const attachment = attachmentResult.rows[0];

    if (!attachment) {
      throw new NotFoundException('Dosya bulunamadı.');
    }

    const safeStoredName = basename(attachment.storedName);
    const filePath = resolve(process.cwd(), 'uploads', safeStoredName);

    try {
      await unlink(filePath);
    } catch (error: unknown) {
      if (!this.isFileNotFoundError(error)) {
        throw error;
      }
    }

    const deleteResult = await this.dbService.query<{ id: string }>(
      `
        DELETE FROM attachments
        WHERE id = $1
        RETURNING id
      `,
      [attachmentId],
    );

    if (!deleteResult.rows[0]) {
      throw new NotFoundException('Dosya bulunamadı.');
    }

    return { message: 'Dosya silindi.' };
  }

  private async assertTaskExists(taskId: string): Promise<void> {
    const result = await this.dbService.query<TaskRow>(
      `
        SELECT id
        FROM tasks
        WHERE id = $1 AND deleted_at IS NULL
      `,
      [taskId],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('Görev bulunamadı.');
    }
  }

  private isFileNotFoundError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    );
  }
}
