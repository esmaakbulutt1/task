import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type { QueryResultRow } from 'pg';
import type { TaskRow } from '../tasks/tasks.service';
import type { ProjectRow } from '../projects/projects.service';
import { DbService } from '../database/db.service';
import {
  PROJECT_SEARCH_PREFIX,
  SEARCH_SYNC_BATCH_SIZE,
  SEARCH_SYNC_INTERVAL_MS,
  TASK_SEARCH_PREFIX,
} from './search.constants';
import { SearchDocumentService } from './search-document.service';
import { SearchIndexService } from './search-index/search-index.service';
import { Inject } from '@nestjs/common';
import { RedisToken } from '@nestjs-redis/client';
import type { RedisClientType } from 'redis';

interface OutboxRow extends QueryResultRow {
  entityType: 'workspace' | 'project' | 'task';
  entityId: string;
  operation: 'upsert' | 'delete';
  version: string;
  attempts: number;
}

interface ActiveWorkspaceRow extends QueryResultRow {
  active: boolean;
}

interface IdRow extends QueryResultRow {
  id: string;
}

@Injectable()
export class SearchSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SearchSyncService.name);
  private timer?: NodeJS.Timeout;
  private workerRunning = false;

  constructor(
    private readonly dbService: DbService,
    private readonly searchIndexService: SearchIndexService,
    private readonly searchDocumentService: SearchDocumentService,
    @Inject(RedisToken()) private readonly redis: RedisClientType,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.searchIndexService.ensureIndexes();
    await this.reconcileAll();
    await this.runWorker();

    this.timer = setInterval(() => {
      void this.runWorker();
    }, SEARCH_SYNC_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async reconcileAll(): Promise<void> {
    const client = await this.dbService.getClient();

    try {
      const lockResult = await client.query<{ locked: boolean }>(
        'SELECT pg_try_advisory_lock(1463892017) AS locked',
      );

      if (!lockResult.rows[0]?.locked) {
        this.logger.log(
          'Search reconciliation is already running on another API instance.',
        );
        return;
      }

      try {
        const projectsResult = await client.query<ProjectRow>(
          this.activeProjectsSql(),
        );
        const tasksResult = await client.query<TaskRow>(this.activeTasksSql());

        await this.syncInBatches(projectsResult.rows, (project) =>
          this.searchDocumentService.upsertProject(project),
        );
        await this.syncInBatches(tasksResult.rows, (task) =>
          this.searchDocumentService.upsertTask(task),
        );

        await this.deleteStaleKeys(
          PROJECT_SEARCH_PREFIX,
          new Set(projectsResult.rows.map((project) => project.id)),
        );
        await this.deleteStaleKeys(
          TASK_SEARCH_PREFIX,
          new Set(tasksResult.rows.map((task) => task.id)),
        );

        this.logger.log(
          `Redis Search reconciled: ${projectsResult.rowCount ?? 0} projects, ${tasksResult.rowCount ?? 0} tasks.`,
        );
      } finally {
        await client.query('SELECT pg_advisory_unlock(1463892017)');
      }
    } finally {
      client.release();
    }
  }

  private async runWorker(): Promise<void> {
    if (this.workerRunning) {
      return;
    }

    this.workerRunning = true;

    try {
      const events = await this.claimEvents();

      for (const event of events) {
        await this.processEvent(event);
      }
    } catch (error: unknown) {
      this.logger.error(
        'Redis Search outbox worker failed.',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.workerRunning = false;
    }
  }

  private async claimEvents(): Promise<OutboxRow[]> {
    const result = await this.dbService.query<OutboxRow>(
      `
        WITH pending AS (
          SELECT entity_type, entity_id, version
          FROM search_outbox
          WHERE
            processed_at IS NULL
            AND available_at <= NOW()
            AND (locked_until IS NULL OR locked_until < NOW())
          ORDER BY available_at ASC, created_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT $1
        )
        UPDATE search_outbox AS outbox
        SET
          locked_until = NOW() + INTERVAL '30 seconds',
          attempts = outbox.attempts + 1,
          updated_at = NOW()
        FROM pending
        WHERE
          outbox.entity_type = pending.entity_type
          AND outbox.entity_id = pending.entity_id
          AND outbox.version = pending.version
        RETURNING
          outbox.entity_type AS "entityType",
          outbox.entity_id AS "entityId",
          outbox.operation,
          outbox.version::text AS version,
          outbox.attempts
      `,
      [SEARCH_SYNC_BATCH_SIZE],
    );

    return result.rows;
  }

  private async processEvent(event: OutboxRow): Promise<void> {
    try {
      if (event.entityType === 'project') {
        await this.syncProject(event.entityId);
      } else if (event.entityType === 'task') {
        await this.syncTask(event.entityId);
      } else {
        await this.syncWorkspace(event.entityId);
      }

      await this.dbService.query(
        `
          UPDATE search_outbox
          SET
            processed_at = NOW(),
            locked_until = NULL,
            last_error = NULL,
            updated_at = NOW()
          WHERE
            entity_type = $1
            AND entity_id = $2
            AND version = $3::bigint
        `,
        [event.entityType, event.entityId, event.version],
      );
    } catch (error: unknown) {
      const message = this.errorMessage(error);
      const retrySeconds = Math.min(300, 2 ** Math.min(event.attempts, 8));

      await this.dbService.query(
        `
          UPDATE search_outbox
          SET
            available_at = NOW() + ($4 * INTERVAL '1 second'),
            locked_until = NULL,
            last_error = LEFT($5, 2000),
            updated_at = NOW()
          WHERE
            entity_type = $1
            AND entity_id = $2
            AND version = $3::bigint
        `,
        [
          event.entityType,
          event.entityId,
          event.version,
          retrySeconds,
          message,
        ],
      );

      this.logger.warn(
        `Search sync will retry ${event.entityType}:${event.entityId}: ${message}`,
      );
    }
  }

  private async syncProject(projectId: string): Promise<void> {
    const result = await this.dbService.query<ProjectRow>(
      `${this.activeProjectsSql()} AND p.id = $1`,
      [projectId],
    );
    const project = result.rows[0];

    if (project) {
      await this.searchDocumentService.upsertProject(project);
      return;
    }

    await this.searchDocumentService.deleteProject(projectId);

    const tasks = await this.dbService.query<IdRow>(
      'SELECT id FROM tasks WHERE project_id = $1',
      [projectId],
    );
    await this.deleteTaskIds(tasks.rows.map((task) => task.id));
  }

  private async syncTask(taskId: string): Promise<void> {
    const result = await this.dbService.query<TaskRow>(
      `${this.activeTasksSql()} AND t.id = $1`,
      [taskId],
    );
    const task = result.rows[0];

    if (task) {
      await this.searchDocumentService.upsertTask(task);
      return;
    }

    await this.searchDocumentService.deleteTask(taskId);
  }

  private async syncWorkspace(workspaceId: string): Promise<void> {
    const workspaceResult = await this.dbService.query<ActiveWorkspaceRow>(
      'SELECT deleted_at IS NULL AS active FROM workspaces WHERE id = $1',
      [workspaceId],
    );

    if (workspaceResult.rows[0]?.active) {
      const projects = await this.dbService.query<ProjectRow>(
        `${this.activeProjectsSql()} AND p.workspace_id = $1`,
        [workspaceId],
      );
      const tasks = await this.dbService.query<TaskRow>(
        `${this.activeTasksSql()} AND p.workspace_id = $1`,
        [workspaceId],
      );

      await this.syncInBatches(projects.rows, (project) =>
        this.searchDocumentService.upsertProject(project),
      );
      await this.syncInBatches(tasks.rows, (task) =>
        this.searchDocumentService.upsertTask(task),
      );
      return;
    }

    const projects = await this.dbService.query<IdRow>(
      'SELECT id FROM projects WHERE workspace_id = $1',
      [workspaceId],
    );
    const tasks = await this.dbService.query<IdRow>(
      `
        SELECT t.id
        FROM tasks t
        INNER JOIN projects p ON p.id = t.project_id
        WHERE p.workspace_id = $1
      `,
      [workspaceId],
    );

    await this.syncInBatches(projects.rows, (project) =>
      this.searchDocumentService.deleteProject(project.id),
    );
    await this.deleteTaskIds(tasks.rows.map((task) => task.id));
  }

  private activeProjectsSql(): string {
    return `
      SELECT
        p.id,
        p.workspace_id AS "workspaceId",
        p.name,
        p.description,
        p.status,
        p.start_date AS "startDate",
        p.due_date AS "dueDate",
        p.created_by AS "createdBy",
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt",
        p.deleted_at AS "deletedAt"
      FROM projects p
      INNER JOIN workspaces w ON w.id = p.workspace_id
      WHERE
        p.deleted_at IS NULL
        AND w.deleted_at IS NULL
    `;
  }

  private activeTasksSql(): string {
    return `
      SELECT
        t.id,
        t.project_id AS "projectId",
        t.title,
        t.description,
        t.status,
        t.priority,
        t.due_date AS "dueDate",
        t.created_by AS "createdBy",
        t.assigned_to AS "assignedTo",
        t.created_at AS "createdAt",
        t.updated_at AS "updatedAt",
        t.deleted_at AS "deletedAt"
      FROM tasks t
      INNER JOIN projects p ON p.id = t.project_id
      INNER JOIN workspaces w ON w.id = p.workspace_id
      WHERE
        t.deleted_at IS NULL
        AND p.deleted_at IS NULL
        AND w.deleted_at IS NULL
    `;
  }

  private async deleteStaleKeys(
    prefix: string,
    activeIds: Set<string>,
  ): Promise<void> {
    for await (const keys of this.redis.scanIterator({
      MATCH: `${prefix}*`,
      COUNT: 250,
    })) {
      const staleKeys = keys.filter(
        (key) => !activeIds.has(key.slice(prefix.length)),
      );

      if (staleKeys.length > 0) {
        await this.redis.del(staleKeys);
      }
    }
  }

  private async deleteTaskIds(taskIds: string[]): Promise<void> {
    await this.syncInBatches(taskIds, (taskId) =>
      this.searchDocumentService.deleteTask(taskId),
    );
  }

  private async syncInBatches<T>(
    rows: T[],
    action: (row: T) => Promise<void>,
  ): Promise<void> {
    for (let index = 0; index < rows.length; index += SEARCH_SYNC_BATCH_SIZE) {
      await Promise.all(
        rows
          .slice(index, index + SEARCH_SYNC_BATCH_SIZE)
          .map((row) => action(row)),
      );
    }
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return typeof error === 'string' ? error : 'Unknown error';
  }
}
