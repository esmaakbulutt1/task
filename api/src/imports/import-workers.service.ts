import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { AuditQueueService } from '../audit/audit-queue.service';
import { DbService } from '../database/db.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { QueueService } from '../queue/queue.service';
import type { TaskPriority, TaskStatus } from '../tasks/tasks.service';
import { parseCsvRows, type CsvRow } from './csv-row-parser';
import {
  CSV_HEADERS,
  IMPORT_BATCH_SIZE,
  IMPORT_UPLOAD_DIRECTORY,
} from './imports.constants';
import type { ImportTaskRow, InsertTaskBatchJobData } from './import-job.types';

interface ImportWorkerRow {
  id: string;
  workspaceId: string;
  projectId: string;
  userId: string;
  storedFileName: string;
}

interface WorkspaceMemberRow {
  userId: string;
  email: string;
}

interface FailedRowInput {
  row_number: number;
  raw_data: Record<string, unknown>;
  error_message: string;
}

interface ClaimedRow {
  rowNumber: number;
}

interface ImportBatchContextRow {
  id: string;
  workspaceId: string;
}

interface ValidatedRowResult {
  row?: ImportTaskRow;
  error?: string;
}

const TASK_STATUSES = new Set<TaskStatus>([
  'backlog',
  'todo',
  'in_progress',
  'review',
  'completed',
]);

const TASK_PRIORITIES = new Set<TaskPriority>([
  'low',
  'medium',
  'high',
  'urgent',
]);

@Injectable()
export class ImportWorkersService {
  private readonly logger = new Logger(ImportWorkersService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly queueService: QueueService,
    private readonly auditQueueService: AuditQueueService,
  ) {}

  async parseImport(importJobId: string): Promise<void> {
    const importJob = await this.findImportJob(importJobId);
    const safeStoredFileName = basename(importJob.storedFileName);
    const filePath = resolve(IMPORT_UPLOAD_DIRECTORY, safeStoredFileName);

    await this.dbService.query(
      `
        UPDATE import_jobs
        SET status = 'parsing', error_message = NULL, updated_at = NOW()
        WHERE id = $1
      `,
      [importJobId],
    );

    try {
      const memberMap = await this.getWorkspaceMemberMap(importJob.workspaceId);
      let headerRead = false;
      let totalRows = 0;
      let batchNumber = 0;
      let validRows: ImportTaskRow[] = [];
      let failedRows: FailedRowInput[] = [];

      for await (const csvRow of parseCsvRows(filePath)) {
        if (!headerRead) {
          this.assertValidHeaders(csvRow);
          headerRead = true;
          continue;
        }

        if (csvRow.values.every((value) => value.trim().length === 0)) {
          continue;
        }

        totalRows += 1;
        const validationResult = this.validateRow(csvRow, memberMap);

        if (!validationResult.row) {
          failedRows.push({
            row_number: csvRow.rowNumber,
            raw_data: this.toRawData(csvRow.values),
            error_message: validationResult.error ?? 'Geçersiz CSV satırı.',
          });

          if (failedRows.length >= IMPORT_BATCH_SIZE) {
            await this.saveFailedRows(importJobId, failedRows);
            failedRows = [];
          }

          continue;
        }

        validRows.push(validationResult.row);

        if (validRows.length >= IMPORT_BATCH_SIZE) {
          await this.enqueueBatch(importJob, batchNumber, validRows);
          batchNumber += 1;
          validRows = [];
        }
      }

      if (!headerRead) {
        throw new Error('CSV dosyası başlık satırı içermiyor.');
      }

      if (failedRows.length > 0) {
        await this.saveFailedRows(importJobId, failedRows);
      }

      if (validRows.length > 0) {
        await this.enqueueBatch(importJob, batchNumber, validRows);
      }

      await this.finishParsing(importJobId, totalRows);
      await this.removeParsedFile(filePath);

      this.logger.log(
        `CSV parsing completed for import ${importJobId}: ${totalRows} rows.`,
      );
    } catch (error: unknown) {
      await this.markImportFailed(importJobId, error);
      throw error;
    }
  }

  async insertBatch(data: InsertTaskBatchJobData): Promise<number> {
    const client = await this.dbService.getClient();
    let transactionStarted = false;

    try {
      await client.query('BEGIN');
      transactionStarted = true;

      const importResult = await client.query<ImportBatchContextRow>(
        `
          SELECT id, workspace_id AS "workspaceId"
          FROM import_jobs
          WHERE id = $1 AND project_id = $2 AND user_id = $3
        `,
        [data.importJobId, data.projectId, data.userId],
      );

      const importContext = importResult.rows[0];

      if (!importContext) {
        throw new NotFoundException('İçe aktarma işi bulunamadı.');
      }

      const claimResult = await client.query<ClaimedRow>(
        `
          INSERT INTO import_succeeded_rows (import_job_id, row_number)
          SELECT $1, row_number
          FROM UNNEST($2::integer[]) AS input(row_number)
          ON CONFLICT (import_job_id, row_number) DO NOTHING
          RETURNING row_number AS "rowNumber"
        `,
        [data.importJobId, data.rows.map((row) => row.rowNumber)],
      );
      const claimedRowNumbers = new Set(
        claimResult.rows.map((row) => row.rowNumber),
      );
      const claimedRows = data.rows.filter((row) =>
        claimedRowNumbers.has(row.rowNumber),
      );

      if (claimedRows.length === 0) {
        await client.query('COMMIT');
        transactionStarted = false;
        return 0;
      }

      const taskRows = claimedRows.map((row) => ({
        id: randomUUID(),
        row_number: row.rowNumber,
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        due_date: row.dueDate,
        assigned_to: row.assignedTo,
      }));

      await client.query(
        `
          INSERT INTO tasks (
            id,
            project_id,
            title,
            description,
            status,
            priority,
            due_date,
            created_by,
            assigned_to
          )
          SELECT
            row.id,
            $2,
            row.title,
            row.description,
            row.status,
            row.priority,
            row.due_date,
            $3,
            row.assigned_to
          FROM jsonb_to_recordset($1::jsonb) AS row(
            id uuid,
            row_number integer,
            title text,
            description text,
            status text,
            priority text,
            due_date timestamptz,
            assigned_to uuid
          )
        `,
        [JSON.stringify(taskRows), data.projectId, data.userId],
      );

      await client.query(
        `
          UPDATE import_succeeded_rows succeeded
          SET task_id = input.task_id
          FROM jsonb_to_recordset($2::jsonb) AS input(
            row_number integer,
            task_id uuid
          )
          WHERE
            succeeded.import_job_id = $1
            AND succeeded.row_number = input.row_number
        `,
        [
          data.importJobId,
          JSON.stringify(
            taskRows.map((row) => ({
              row_number: row.row_number,
              task_id: row.id,
            })),
          ),
        ],
      );

      await client.query('COMMIT');
      transactionStarted = false;

      await this.refreshProgress(data.importJobId);
      await this.auditQueueService.enqueue({
        workspaceId: importContext.workspaceId,
        userId: data.userId,
        action: 'task_import.batch_inserted',
        entityType: 'task_import',
        entityId: data.importJobId,
        oldData: null,
        newData: {
          batchNumber: data.batchNumber,
          insertedTasks: claimedRows.length,
          rowNumbers: claimedRows.map((row) => row.rowNumber),
        },
      });
      this.logger.log(
        `Import ${data.importJobId} batch ${data.batchNumber} inserted ${claimedRows.length} tasks.`,
      );

      return claimedRows.length;
    } catch (error: unknown) {
      if (transactionStarted) {
        await client.query('ROLLBACK');
      }

      await this.recordBatchError(data.importJobId, error);
      throw error;
    } finally {
      client.release();
    }
  }

  private async findImportJob(importJobId: string): Promise<ImportWorkerRow> {
    const result = await this.dbService.query<ImportWorkerRow>(
      `
        SELECT
          id,
          workspace_id AS "workspaceId",
          project_id AS "projectId",
          user_id AS "userId",
          stored_file_name AS "storedFileName"
        FROM import_jobs
        WHERE id = $1
      `,
      [importJobId],
    );
    const importJob = result.rows[0];

    if (!importJob) {
      throw new NotFoundException('İçe aktarma işi bulunamadı.');
    }

    return importJob;
  }

  private async getWorkspaceMemberMap(
    workspaceId: string,
  ): Promise<Map<string, string>> {
    const result = await this.dbService.query<WorkspaceMemberRow>(
      `
        SELECT
          u.id AS "userId",
          LOWER(u.email) AS email
        FROM workspace_members wm
        INNER JOIN users u ON u.id = wm.user_id
        WHERE wm.workspace_id = $1 AND u.is_active = TRUE
      `,
      [workspaceId],
    );

    return new Map(result.rows.map((row) => [row.email, row.userId]));
  }

  private assertValidHeaders(row: CsvRow): void {
    const headers = row.values.map((value) => value.trim().toLowerCase());
    const valid =
      headers.length === CSV_HEADERS.length &&
      CSV_HEADERS.every((header, index) => headers[index] === header);

    if (!valid) {
      throw new Error(
        `CSV başlıkları şu sırada olmalıdır: ${CSV_HEADERS.join(',')}`,
      );
    }
  }

  private validateRow(
    csvRow: CsvRow,
    memberMap: Map<string, string>,
  ): ValidatedRowResult {
    if (csvRow.values.length !== CSV_HEADERS.length) {
      return { error: `Satır ${CSV_HEADERS.length} kolon içermelidir.` };
    }

    const [
      rawTitle,
      rawDescription,
      rawStatus,
      rawPriority,
      rawDueDate,
      rawAssignedEmail,
    ] = csvRow.values;
    const title = rawTitle.trim();
    const description = rawDescription.trim();
    const statusValue = rawStatus.trim().toLowerCase() || 'backlog';
    const priorityValue = rawPriority.trim().toLowerCase() || 'medium';
    const dueDateValue = rawDueDate.trim();
    const assignedEmail = rawAssignedEmail.trim().toLowerCase();
    const errors: string[] = [];

    if (!title) {
      errors.push('Title zorunludur.');
    } else if (title.length > 200) {
      errors.push('Title en fazla 200 karakter olabilir.');
    }

    if (description.length > 1000) {
      errors.push('Description en fazla 1000 karakter olabilir.');
    }

    if (!TASK_STATUSES.has(statusValue as TaskStatus)) {
      errors.push('Status geçersiz.');
    }

    if (!TASK_PRIORITIES.has(priorityValue as TaskPriority)) {
      errors.push('Priority geçersiz.');
    }

    let dueDate: string | null = null;

    if (dueDateValue) {
      const parsedDueDate = new Date(dueDateValue);

      if (Number.isNaN(parsedDueDate.getTime())) {
        errors.push('Due date geçersiz.');
      } else {
        dueDate = parsedDueDate.toISOString();
      }
    }

    let assignedTo: string | null = null;

    if (assignedEmail) {
      assignedTo = memberMap.get(assignedEmail) ?? null;

      if (!assignedTo) {
        errors.push('Assigned email çalışma alanı üyesine ait değil.');
      }
    }

    if (errors.length > 0) {
      return { error: errors.join(' ') };
    }

    return {
      row: {
        rowNumber: csvRow.rowNumber,
        title,
        description: description || null,
        status: statusValue as TaskStatus,
        priority: priorityValue as TaskPriority,
        dueDate,
        assignedTo,
      },
    };
  }

  private toRawData(values: string[]): Record<string, unknown> {
    return Object.fromEntries(
      CSV_HEADERS.map((header, index) => [header, values[index] ?? null]),
    );
  }

  private async saveFailedRows(
    importJobId: string,
    rows: FailedRowInput[],
  ): Promise<void> {
    await this.dbService.query(
      `
        INSERT INTO import_failed_rows (
          import_job_id,
          row_number,
          raw_data,
          error_message
        )
        SELECT
          $1,
          row.row_number,
          row.raw_data,
          row.error_message
        FROM jsonb_to_recordset($2::jsonb) AS row(
          row_number integer,
          raw_data jsonb,
          error_message text
        )
        ON CONFLICT (import_job_id, row_number) DO NOTHING
      `,
      [importJobId, JSON.stringify(rows)],
    );
  }

  private async enqueueBatch(
    importJob: ImportWorkerRow,
    batchNumber: number,
    rows: ImportTaskRow[],
  ): Promise<void> {
    const data: InsertTaskBatchJobData = {
      importJobId: importJob.id,
      projectId: importJob.projectId,
      userId: importJob.userId,
      batchNumber,
      rows,
    };

    await this.queueService.enqueue(QUEUE_NAMES.INSERT_TASK_BATCH, data, {
      singletonKey: `${importJob.id}:${batchNumber}`,
      singletonSeconds: 7 * 24 * 60 * 60,
    });
  }

  private async finishParsing(
    importJobId: string,
    totalRows: number,
  ): Promise<void> {
    await this.dbService.query(
      `
        WITH progress AS (
          SELECT
            (SELECT COUNT(*)::integer FROM import_failed_rows WHERE import_job_id = $1) AS failed,
            (SELECT COUNT(*)::integer FROM import_succeeded_rows WHERE import_job_id = $1) AS succeeded
        )
        UPDATE import_jobs job
        SET
          total_rows = $2,
          processed_rows = progress.failed + progress.succeeded,
          failed_rows = progress.failed,
          parsing_finished = TRUE,
          status = CASE
            WHEN progress.failed + progress.succeeded >= $2 THEN 'completed'
            ELSE 'processing'
          END,
          error_message = NULL,
          updated_at = NOW()
        FROM progress
        WHERE job.id = $1
      `,
      [importJobId, totalRows],
    );
  }

  private async refreshProgress(importJobId: string): Promise<void> {
    await this.dbService.query(
      `
        WITH progress AS (
          SELECT
            (SELECT COUNT(*)::integer FROM import_failed_rows WHERE import_job_id = $1) AS failed,
            (SELECT COUNT(*)::integer FROM import_succeeded_rows WHERE import_job_id = $1) AS succeeded
        )
        UPDATE import_jobs job
        SET
          processed_rows = progress.failed + progress.succeeded,
          failed_rows = progress.failed,
          status = CASE
            WHEN job.parsing_finished
              AND progress.failed + progress.succeeded >= job.total_rows
              THEN 'completed'
            ELSE 'processing'
          END,
          error_message = NULL,
          updated_at = NOW()
        FROM progress
        WHERE job.id = $1
      `,
      [importJobId],
    );
  }

  private async markImportFailed(
    importJobId: string,
    error: unknown,
  ): Promise<void> {
    await this.dbService.query(
      `
        UPDATE import_jobs
        SET status = 'failed', error_message = $2, updated_at = NOW()
        WHERE id = $1
      `,
      [importJobId, this.getErrorMessage(error)],
    );
  }

  private async recordBatchError(
    importJobId: string,
    error: unknown,
  ): Promise<void> {
    await this.dbService.query(
      `
        UPDATE import_jobs
        SET error_message = $2, updated_at = NOW()
        WHERE id = $1
      `,
      [importJobId, this.getErrorMessage(error)],
    );
  }

  private async removeParsedFile(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
    } catch (error: unknown) {
      if (!this.isFileNotFoundError(error)) {
        this.logger.warn(`Parsed CSV file could not be deleted: ${filePath}`);
      }
    }
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error
      ? error.message.slice(0, 1000)
      : 'Bilinmeyen içe aktarma hatası.';
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
