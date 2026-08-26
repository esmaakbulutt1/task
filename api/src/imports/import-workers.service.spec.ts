import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AuditQueueService } from '../audit/audit-queue.service';
import type { DbService } from '../database/db.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import type { QueueService } from '../queue/queue.service';
import type { InsertTaskBatchJobData } from './import-job.types';
import { ImportWorkersService } from './import-workers.service';
import { IMPORT_UPLOAD_DIRECTORY } from './imports.constants';

jest.mock('pg-boss', () => ({ PgBoss: jest.fn() }));

describe('ImportWorkersService', () => {
  const query = jest.fn();
  const getClient = jest.fn();
  const enqueue = jest.fn().mockResolvedValue('batch-job-id');
  const enqueueAudit = jest.fn().mockResolvedValue('audit-job-id');
  const service = new ImportWorkersService(
    { query, getClient } as unknown as DbService,
    { enqueue } as unknown as QueueService,
    { enqueue: enqueueAudit } as unknown as AuditQueueService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parses valid rows into batches and stores invalid rows separately', async () => {
    await mkdir(IMPORT_UPLOAD_DIRECTORY, { recursive: true });
    const storedFileName = `import-worker-${Date.now()}.csv`;
    const filePath = join(IMPORT_UPLOAD_DIRECTORY, storedFileName);
    await writeFile(
      filePath,
      [
        'title,description,status,priority,due_date,assigned_email',
        'Valid task,Description,todo,high,2026-09-10,user@example.com',
        'Invalid task,Description,wrong,high,2026-09-10,user@example.com',
      ].join('\n'),
      'utf8',
    );
    query.mockImplementation((sql: string) => {
      if (
        sql.includes('FROM import_jobs') &&
        sql.includes('stored_file_name')
      ) {
        return Promise.resolve({
          rows: [
            {
              id: 'import-id',
              workspaceId: 'workspace-id',
              projectId: 'project-id',
              userId: 'user-id',
              storedFileName,
            },
          ],
        });
      }

      if (sql.includes('FROM workspace_members')) {
        return Promise.resolve({
          rows: [{ userId: 'assignee-id', email: 'user@example.com' }],
        });
      }

      return Promise.resolve({ rows: [] });
    });

    await service.parseImport('import-id');

    expect(enqueue).toHaveBeenCalledWith(
      QUEUE_NAMES.INSERT_TASK_BATCH,
      expect.objectContaining({
        importJobId: 'import-id',
        projectId: 'project-id',
        userId: 'user-id',
        batchNumber: 0,
        rows: [
          expect.objectContaining({
            rowNumber: 2,
            title: 'Valid task',
            assignedTo: 'assignee-id',
          }),
        ],
      }),
      {
        singletonKey: 'import-id:0',
        singletonSeconds: 7 * 24 * 60 * 60,
      },
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO import_failed_rows'),
      expect.arrayContaining(['import-id']),
    );
  });

  it('does not insert a row already claimed by an earlier retry', async () => {
    const clientQuery = jest.fn();
    const release = jest.fn();
    getClient.mockResolvedValue({ query: clientQuery, release });
    clientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: 'import-id', workspaceId: 'workspace-id' }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const data: InsertTaskBatchJobData = {
      importJobId: 'import-id',
      projectId: 'project-id',
      userId: 'user-id',
      batchNumber: 0,
      rows: [
        {
          rowNumber: 2,
          title: 'Already processed',
          description: null,
          status: 'todo',
          priority: 'medium',
          dueDate: null,
          assignedTo: null,
        },
      ],
    };

    const inserted = await service.insertBatch(data);

    expect(inserted).toBe(0);
    expect(clientQuery).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO tasks'),
      expect.anything(),
    );
    expect(release).toHaveBeenCalled();
  });
});
