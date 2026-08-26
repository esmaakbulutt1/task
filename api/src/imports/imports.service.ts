import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../database/db.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { QueueService } from '../queue/queue.service';
import type { ListImportFailedRowsQueryDto } from './dto/list-import-failed-rows-query.dto';
import type { ParseTaskCsvJobData } from './import-job.types';

export type ImportJobStatus =
  'pending' | 'parsing' | 'processing' | 'completed' | 'failed';

interface ImportProjectRow {
  workspaceId: string;
}

export interface ImportJobRow {
  id: string;
  workspaceId: string;
  projectId: string;
  userId: string;
  fileName: string;
  storedFileName: string;
  status: ImportJobStatus;
  totalRows: number;
  processedRows: number;
  failedRows: number;
  parsingFinished: boolean;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImportJobStatusResponse extends ImportJobRow {
  successfulRows: number;
  progressPercentage: number;
}

export interface ImportFailedRow {
  id: string;
  rowNumber: number;
  rawData: Record<string, unknown>;
  errorMessage: string;
  createdAt: Date;
}

export interface PaginatedImportFailedRows {
  data: ImportFailedRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface CountRow {
  total: string;
}

@Injectable()
export class ImportsService {
  constructor(
    private readonly dbService: DbService,
    private readonly queueService: QueueService,
  ) {}

  async create(
    projectId: string,
    userId: string,
    fileName: string,
    storedFileName: string,
  ): Promise<ImportJobRow> {
    const projectResult = await this.dbService.query<ImportProjectRow>(
      `
        SELECT p.workspace_id AS "workspaceId"
        FROM projects p
        INNER JOIN workspaces w
          ON w.id = p.workspace_id
        INNER JOIN workspace_members wm
          ON wm.workspace_id = p.workspace_id
          AND wm.user_id = $2
        WHERE
          p.id = $1
          AND p.deleted_at IS NULL
          AND w.deleted_at IS NULL
          AND wm.role IN ('owner', 'admin')
      `,
      [projectId, userId],
    );
    const project = projectResult.rows[0];

    if (!project) {
      throw new NotFoundException('İçe aktarılacak proje bulunamadı.');
    }

    const importResult = await this.dbService.query<ImportJobRow>(
      `
        INSERT INTO import_jobs (
          workspace_id,
          project_id,
          user_id,
          file_name,
          stored_file_name
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          workspace_id AS "workspaceId",
          project_id AS "projectId",
          user_id AS "userId",
          file_name AS "fileName",
          stored_file_name AS "storedFileName",
          status,
          total_rows AS "totalRows",
          processed_rows AS "processedRows",
          failed_rows AS "failedRows",
          parsing_finished AS "parsingFinished",
          error_message AS "errorMessage",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [project.workspaceId, projectId, userId, fileName, storedFileName],
    );
    const importJob = importResult.rows[0];

    try {
      const jobData: ParseTaskCsvJobData = { importJobId: importJob.id };

      await this.queueService.enqueue(QUEUE_NAMES.PARSE_TASK_CSV, jobData, {
        singletonKey: importJob.id,
        singletonSeconds: 7 * 24 * 60 * 60,
      });
    } catch (error: unknown) {
      await this.dbService.query(
        `
          UPDATE import_jobs
          SET status = 'failed', error_message = $2, updated_at = NOW()
          WHERE id = $1
        `,
        [importJob.id, this.getErrorMessage(error)],
      );

      throw error;
    }

    return importJob;
  }

  async findStatus(
    importJobId: string,
    userId: string,
  ): Promise<ImportJobStatusResponse> {
    const result = await this.dbService.query<ImportJobRow>(
      `
        SELECT
          id,
          workspace_id AS "workspaceId",
          project_id AS "projectId",
          user_id AS "userId",
          file_name AS "fileName",
          stored_file_name AS "storedFileName",
          status,
          total_rows AS "totalRows",
          processed_rows AS "processedRows",
          failed_rows AS "failedRows",
          parsing_finished AS "parsingFinished",
          error_message AS "errorMessage",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM import_jobs
        WHERE id = $1 AND user_id = $2
      `,
      [importJobId, userId],
    );
    const importJob = result.rows[0];

    if (!importJob) {
      throw new NotFoundException('İçe aktarma işi bulunamadı.');
    }

    return {
      ...importJob,
      successfulRows: importJob.processedRows - importJob.failedRows,
      progressPercentage:
        importJob.status === 'completed'
          ? 100
          : importJob.totalRows === 0
            ? 0
            : Math.min(
                100,
                Math.round(
                  (importJob.processedRows / importJob.totalRows) * 100,
                ),
              ),
    };
  }

  async findFailedRows(
    importJobId: string,
    userId: string,
    query: ListImportFailedRowsQueryDto,
  ): Promise<PaginatedImportFailedRows> {
    await this.assertImportOwner(importJobId, userId);

    const offset = (query.page - 1) * query.limit;
    const [countResult, rowsResult] = await Promise.all([
      this.dbService.query<CountRow>(
        `
          SELECT COUNT(*) AS total
          FROM import_failed_rows
          WHERE import_job_id = $1
        `,
        [importJobId],
      ),
      this.dbService.query<ImportFailedRow>(
        `
          SELECT
            id,
            row_number AS "rowNumber",
            raw_data AS "rawData",
            error_message AS "errorMessage",
            created_at AS "createdAt"
          FROM import_failed_rows
          WHERE import_job_id = $1
          ORDER BY row_number ASC
          LIMIT $2 OFFSET $3
        `,
        [importJobId, query.limit, offset],
      ),
    ]);
    const total = Number(countResult.rows[0]?.total ?? 0);

    return {
      data: rowsResult.rows,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  private async assertImportOwner(
    importJobId: string,
    userId: string,
  ): Promise<void> {
    const result = await this.dbService.query<{ id: string }>(
      `
        SELECT id
        FROM import_jobs
        WHERE id = $1 AND user_id = $2
      `,
      [importJobId, userId],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('İçe aktarma işi bulunamadı.');
    }
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error
      ? error.message.slice(0, 1000)
      : 'Bilinmeyen içe aktarma hatası.';
  }
}
