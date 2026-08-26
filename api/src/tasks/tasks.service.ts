import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { AuditQueueService } from '../audit/audit-queue.service';
import { DbService } from '../database/db.service';
import { MailQueueService } from '../mail/mail-queue.service';
import { NotificationQueueService } from '../notifications/notification-queue.service';
import { TasksSearchService } from '../search/tasks-search.service';
import { CreateTaskDto } from './dto/create-task.dto';
import type { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import type { UpdateTaskDto } from './dto/update-task.dto';

export type TaskStatus =
  'backlog' | 'todo' | 'in_progress' | 'review' | 'completed';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskRow {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  createdBy: string;
  assignedTo: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface AssignmentMembershipRow {
  userId: string;
  email: string;
  projectName: string;
  workspaceName: string;
}

interface TaskCountRow {
  total: string;
}

interface ProjectWorkspaceRow {
  workspaceId: string;
}

export interface PaginatedTasks {
  data: TaskRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly notificationQueueService: NotificationQueueService,
    private readonly mailQueueService: MailQueueService,
    private readonly auditQueueService: AuditQueueService,
    @Optional()
    private readonly tasksSearchService?: TasksSearchService,
  ) {}

  async create(
    projectId: string,
    createdByUserId: string,
    body: CreateTaskDto,
  ): Promise<TaskRow> {
    let assignee: AssignmentMembershipRow | null = null;

    if (body.assignedTo) {
      assignee = await this.assertAssigneeIsWorkspaceMember(
        projectId,
        body.assignedTo,
      );
    }

    const taskResult = await this.dbService.query<TaskRow>(
      `
        INSERT INTO tasks (
          project_id,
          title,
          description,
          status,
          priority,
          due_date,
          created_by,
          assigned_to
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
          id,
          project_id AS "projectId",
          title,
          description,
          status,
          priority,
          due_date AS "dueDate",
          created_by AS "createdBy",
          assigned_to AS "assignedTo",
          created_at AS "createdAt",
          updated_at AS "updatedAt",
          deleted_at AS "deletedAt"
      `,
      [
        projectId,
        body.title,
        body.description || null,
        body.status ?? 'backlog',
        body.priority ?? 'medium',
        body.dueDate ?? null,
        createdByUserId,
        body.assignedTo ?? null,
      ],
    );
    const task = taskResult.rows[0];

    if (task.assignedTo) {
      await this.notificationQueueService.enqueue(
        task.assignedTo,
        'task_assigned',
        'Yeni görev atandı',
        `"${task.title}" görevi size atandı.`,
      );

      if (assignee) {
        await this.mailQueueService.enqueueTaskAssigned(
          assignee.email,
          assignee.workspaceName,
          assignee.projectName,
          task.title,
        );
      }
    }

    const workspaceId = await this.getProjectWorkspaceId(projectId);

    await this.auditQueueService.enqueue({
      workspaceId,
      userId: createdByUserId,
      action: 'task.created',
      entityType: 'task',
      entityId: task.id,
      oldData: null,
      newData: task,
    });

    return task;
  }

  async findAll(
    projectId: string,
    query: ListTasksQueryDto,
  ): Promise<PaginatedTasks> {
    if (
      query.dueDateFrom &&
      query.dueDateTo &&
      new Date(query.dueDateTo) < new Date(query.dueDateFrom)
    ) {
      throw new BadRequestException(
        'Bitiş tarihi başlangıç tarihinden önce olamaz.',
      );
    }

    if (this.tasksSearchService) {
      try {
        return await this.tasksSearchService.findAll(projectId, query);
      } catch (error: unknown) {
        this.logger.warn(
          `Redis task search failed; PostgreSQL fallback is being used: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    const conditions = ['t.project_id = $1', 't.deleted_at IS NULL'];
    const params: unknown[] = [projectId];

    if (query.search) {
      params.push(`%${query.search}%`);
      const searchIndex = params.length;
      conditions.push(
        `(t.title ILIKE $${searchIndex} OR COALESCE(t.description, '') ILIKE $${searchIndex})`,
      );
    }

    if (query.status) {
      params.push(query.status);
      conditions.push(`t.status = $${params.length}`);
    }

    if (query.priority) {
      params.push(query.priority);
      conditions.push(`t.priority = $${params.length}`);
    }

    if (query.assignedTo) {
      params.push(query.assignedTo);
      conditions.push(`t.assigned_to = $${params.length}`);
    }

    if (query.createdBy) {
      params.push(query.createdBy);
      conditions.push(`t.created_by = $${params.length}`);
    }

    if (query.dueDateFrom) {
      params.push(query.dueDateFrom);
      conditions.push(`t.due_date >= $${params.length}::date`);
    }

    if (query.dueDateTo) {
      params.push(query.dueDateTo);
      conditions.push(
        `t.due_date < ($${params.length}::date + INTERVAL '1 day')`,
      );
    }

    const whereClause = conditions.join(' AND ');
    const countResult = await this.dbService.query<TaskCountRow>(
      `
        SELECT COUNT(*) AS total
        FROM tasks t
        WHERE ${whereClause}
      `,
      params,
    );
    const total = Number(countResult.rows[0]?.total ?? 0);

    const sortColumns: Record<ListTasksQueryDto['sort'], string> = {
      title: 't.title',
      status: 't.status',
      priority: 't.priority',
      due_date: 't.due_date',
      created_at: 't.created_at',
      updated_at: 't.updated_at',
    };
    const sortColumn = sortColumns[query.sort];
    const sortOrder = query.order === 'asc' ? 'ASC' : 'DESC';
    const offset = (query.page - 1) * query.limit;
    const dataParams = [...params, query.limit, offset];
    const limitIndex = params.length + 1;
    const offsetIndex = params.length + 2;

    const tasksResult = await this.dbService.query<TaskRow>(
      `
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
        WHERE ${whereClause}
        ORDER BY ${sortColumn} ${sortOrder} NULLS LAST, t.id ASC
        LIMIT $${limitIndex}
        OFFSET $${offsetIndex}
      `,
      dataParams,
    );

    return {
      data: tasksResult.rows,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async findOne(taskId: string): Promise<TaskRow> {
    const result = await this.dbService.query<TaskRow>(
      `
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
        WHERE t.id = $1 AND t.deleted_at IS NULL
      `,
      [taskId],
    );
    const task = result.rows[0];

    if (!task) {
      throw new NotFoundException('Görev bulunamadı.');
    }

    return task;
  }

  async update(
    taskId: string,
    requestingUserId: string,
    body: UpdateTaskDto,
  ): Promise<TaskRow> {
    if (
      body.title === undefined &&
      body.description === undefined &&
      body.status === undefined &&
      body.priority === undefined &&
      body.dueDate === undefined &&
      body.assignedTo === undefined
    ) {
      throw new BadRequestException(
        'Güncellenecek en az bir alan gönderilmelidir.',
      );
    }

    const existingTask = await this.findOne(taskId);

    let assignee: AssignmentMembershipRow | null = null;

    if (body.assignedTo !== undefined && body.assignedTo !== null) {
      assignee = await this.assertAssigneeIsWorkspaceMember(
        existingTask.projectId,
        body.assignedTo,
      );
    }

    const result = await this.dbService.query<TaskRow>(
      `
        UPDATE tasks
        SET
          title = COALESCE($1::text, title),
          description = CASE
            WHEN $2::boolean THEN $3::text
            ELSE description
          END,
          status = COALESCE($4::text, status),
          priority = COALESCE($5::text, priority),
          due_date = CASE
            WHEN $6::boolean THEN $7::timestamptz
            ELSE due_date
          END,
          assigned_to = CASE
            WHEN $8::boolean THEN $9::uuid
            ELSE assigned_to
          END,
          updated_at = NOW()
        WHERE id = $10 AND deleted_at IS NULL
        RETURNING
          id,
          project_id AS "projectId",
          title,
          description,
          status,
          priority,
          due_date AS "dueDate",
          created_by AS "createdBy",
          assigned_to AS "assignedTo",
          created_at AS "createdAt",
          updated_at AS "updatedAt",
          deleted_at AS "deletedAt"
      `,
      [
        body.title ?? null,
        body.description !== undefined,
        body.description || null,
        body.status ?? null,
        body.priority ?? null,
        body.dueDate !== undefined,
        body.dueDate ?? null,
        body.assignedTo !== undefined,
        body.assignedTo ?? null,
        taskId,
      ],
    );

    const task = result.rows[0];

    if (task.assignedTo && task.assignedTo !== existingTask.assignedTo) {
      await this.notificationQueueService.enqueue(
        task.assignedTo,
        'task_assigned',
        'Yeni görev atandı',
        `"${task.title}" görevi size atandı.`,
      );

      if (assignee) {
        await this.mailQueueService.enqueueTaskAssigned(
          assignee.email,
          assignee.workspaceName,
          assignee.projectName,
          task.title,
        );
      }
    }

    const workspaceId = await this.getProjectWorkspaceId(task.projectId);
    const action =
      task.assignedTo !== existingTask.assignedTo
        ? 'task.assigned'
        : task.status !== existingTask.status
          ? 'task.status_changed'
          : 'task.updated';

    await this.auditQueueService.enqueue({
      workspaceId,
      userId: requestingUserId,
      action,
      entityType: 'task',
      entityId: task.id,
      oldData: existingTask,
      newData: task,
    });

    return task;
  }

  async remove(
    taskId: string,
    requestingUserId: string,
  ): Promise<{ message: string }> {
    const existingTask = await this.findOne(taskId);
    const workspaceId = await this.getProjectWorkspaceId(
      existingTask.projectId,
    );
    const result = await this.dbService.query<{ id: string }>(
      `
        UPDATE tasks
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id
      `,
      [taskId],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('Görev bulunamadı.');
    }

    await this.auditQueueService.enqueue({
      workspaceId,
      userId: requestingUserId,
      action: 'task.deleted',
      entityType: 'task',
      entityId: taskId,
      oldData: existingTask,
      newData: null,
    });

    return { message: 'Görev silindi.' };
  }

  private async assertAssigneeIsWorkspaceMember(
    projectId: string,
    assignedToUserId: string,
  ): Promise<AssignmentMembershipRow> {
    const membershipResult =
      await this.dbService.query<AssignmentMembershipRow>(
        `
          SELECT
            wm.user_id AS "userId",
            u.email,
            p.name AS "projectName",
            w.name AS "workspaceName"
          FROM projects p
          INNER JOIN workspaces w
            ON w.id = p.workspace_id
          INNER JOIN workspace_members wm
            ON wm.workspace_id = p.workspace_id
          INNER JOIN users u
            ON u.id = wm.user_id
          WHERE
            p.id = $1
            AND p.deleted_at IS NULL
            AND w.deleted_at IS NULL
            AND wm.user_id = $2
            AND u.is_active = TRUE
        `,
        [projectId, assignedToUserId],
      );

    const membership = membershipResult.rows[0];

    if (!membership) {
      throw new BadRequestException(
        'Görev yalnızca aynı çalışma alanının üyesine atanabilir.',
      );
    }

    return membership;
  }

  private async getProjectWorkspaceId(projectId: string): Promise<string> {
    const result = await this.dbService.query<ProjectWorkspaceRow>(
      `
        SELECT workspace_id AS "workspaceId"
        FROM projects
        WHERE id = $1
      `,
      [projectId],
    );
    const project = result.rows[0];

    if (!project) {
      throw new NotFoundException('Proje bulunamadı.');
    }

    return project.workspaceId;
  }
}
