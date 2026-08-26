import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedRequest } from '../auth/authenticated-request.interface';
import { randomUUID } from 'node:crypto';
import { rename, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AuthGuard } from '../auth/auth.guard';
import { WorkspaceRoleGuard } from '../authorization/workspace-role.guard';
import { WorkspaceRoles } from '../authorization/workspace-roles.decorator';
import { ListImportFailedRowsQueryDto } from './dto/list-import-failed-rows-query.dto';
import {
  ALLOWED_IMPORT_MIME_TYPES,
  IMPORT_UPLOAD_DIRECTORY,
  MAX_IMPORT_FILE_SIZE,
} from './imports.constants';
import { ImportsService } from './imports.service';

interface ImportUploadFile {
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
}

@Controller()
export class ImportsController {
  private readonly logger = new Logger(ImportsController.name);

  constructor(private readonly importsService: ImportsService) {}

  @Post('projects/:projectId/import/upload')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(AuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles('owner', 'admin')
  @UseInterceptors(
    FileInterceptor('file', {
      dest: IMPORT_UPLOAD_DIRECTORY,
      limits: { fileSize: MAX_IMPORT_FILE_SIZE },
      fileFilter: (_request, file, callback) => {
        const hasCsvExtension = file.originalname
          .toLowerCase()
          .endsWith('.csv');
        const hasAllowedMimeType = ALLOWED_IMPORT_MIME_TYPES.has(file.mimetype);

        if (!hasCsvExtension || !hasAllowedMimeType) {
          callback(
            new BadRequestException('Yalnızca CSV dosyaları yüklenebilir.'),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  async upload(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file: ImportUploadFile | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('Yüklenecek CSV dosyası gerekli.');
    }

    const storedFileName = `${randomUUID()}.csv`;
    const storedPath = resolve(IMPORT_UPLOAD_DIRECTORY, storedFileName);

    try {
      await rename(file.path, storedPath);

      const importJob = await this.importsService.create(
        projectId,
        request.user.id,
        file.originalname,
        storedFileName,
      );

      this.logger.log(
        `CSV import uploaded: ${importJob.id}, project: ${projectId}, size: ${file.size} bytes.`,
      );

      return importJob;
    } catch (error: unknown) {
      await this.removeFileIfExists(storedPath);
      await this.removeFileIfExists(file.path);
      throw error;
    }
  }

  @Get('imports/:jobId/status')
  @UseGuards(AuthGuard)
  findStatus(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.importsService.findStatus(jobId, request.user.id);
  }

  @Get('imports/:jobId/failed-rows')
  @UseGuards(AuthGuard)
  findFailedRows(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Req() request: AuthenticatedRequest,
    @Query() query: ListImportFailedRowsQueryDto,
  ) {
    return this.importsService.findFailedRows(jobId, request.user.id, query);
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
