import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { randomUUID } from 'node:crypto';
import { rename, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { AuthenticatedRequest } from '../auth/authenticated-request.interface';
import { AuthGuard } from '../auth/auth.guard';
import { WorkspaceRoleGuard } from '../authorization/workspace-role.guard';
import { WorkspaceRoles } from '../authorization/workspace-roles.decorator';
import { type AttachmentFile, AttachmentsService } from './attachments.service';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const UPLOAD_DIRECTORY = resolve(process.cwd(), 'uploads');
const ALLOWED_MIME_TYPES: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

@Controller()
@UseGuards(AuthGuard, WorkspaceRoleGuard)
export class AttachmentsController {
  private readonly logger = new Logger(AttachmentsController.name);

  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('tasks/:taskId/attachments')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @WorkspaceRoles('owner', 'admin', 'member')
  @UseInterceptors(
    FileInterceptor('file', {
      dest: UPLOAD_DIRECTORY,
      limits: {
        fileSize: MAX_FILE_SIZE,
      },
      fileFilter: (_request, file, callback) => {
        if (!ALLOWED_MIME_TYPES[file.mimetype]) {
          callback(
            new BadRequestException(
              'Yalnızca PDF, JPEG ve PNG dosyaları yüklenebilir.',
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  async create(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: AttachmentFile | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('Yüklenecek dosya gerekli.');
    }

    const extension = ALLOWED_MIME_TYPES[file.mimetype];
    const storedName = `${randomUUID()}${extension}`;
    const storedPath = resolve(UPLOAD_DIRECTORY, storedName);

    try {
      await rename(file.path, storedPath);

      const attachment = await this.attachmentsService.create(
        taskId,
        req.user.id,
        {
          ...file,
          filename: storedName,
          path: storedPath,
        },
      );

      this.logger.log(
        `Attachment uploaded: ${attachment.id}, task: ${taskId}, size: ${file.size} bytes.`,
      );

      return attachment;
    } catch (error: unknown) {
      await this.removeFileIfExists(storedPath);
      await this.removeFileIfExists(file.path);
      throw error;
    }
  }

  @Get('tasks/:taskId/attachments')
  @WorkspaceRoles('owner', 'admin', 'member')
  findAll(@Param('taskId', ParseUUIDPipe) taskId: string) {
    return this.attachmentsService.findAll(taskId);
  }

  @Delete('attachments/:attachmentId')
  @WorkspaceRoles('owner', 'admin')
  remove(@Param('attachmentId', ParseUUIDPipe) attachmentId: string) {
    return this.attachmentsService.remove(attachmentId);
  }

  private async removeFileIfExists(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
    } catch (error: unknown) {
      if (!this.isFileNotFoundError(error)) {
        throw error;
      }
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
