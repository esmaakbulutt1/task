import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { AuditQueueService } from '../audit/audit-queue.service';
import { DbService } from '../database/db.service';
import { NotificationQueueService } from '../notifications/notification-queue.service';
import { ProjectsSearchService } from '../search/projects-search.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

export type ProjectStatus = 'planned' | 'active' | 'completed' | 'archived';

export interface ProjectRow {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: string | null;
  dueDate: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface ProjectCountRow {
  total: string;
}

interface WorkspaceMemberUserRow {
  userId: string;
}

export interface PaginatedProjects {
  data: ProjectRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly notificationQueueService: NotificationQueueService,
    private readonly auditQueueService: AuditQueueService,
    @Optional()
    private readonly projectsSearchService?: ProjectsSearchService,
  ) {}

  async create(
    workspaceId: string,
    requestingUserId: string,
    body: CreateProjectDto,
  ): Promise<ProjectRow> {
    if (
      body.startDate &&
      body.dueDate &&
      new Date(body.dueDate) < new Date(body.startDate)
    ) {
      throw new BadRequestException(
        'Bitiş tarihi başlangıç tarihinden önce olamaz.',
      );
    }

    const projectResult = await this.dbService.query<ProjectRow>(
      `
        INSERT INTO projects (
          workspace_id,
          name,
          description,
          status,
          start_date,
          due_date,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id,
          workspace_id AS "workspaceId",
          name,
          description,
          status,
          start_date AS "startDate",
          due_date AS "dueDate",
          created_by AS "createdBy",
          created_at AS "createdAt",
          updated_at AS "updatedAt",
          deleted_at AS "deletedAt"
      `,
      [
        workspaceId,
        body.name,
        body.description || null,
        body.status ?? 'planned',
        body.startDate ?? null,
        body.dueDate ?? null,
        requestingUserId,
      ],
    );

    const project = projectResult.rows[0];

    if (project.status === 'completed') {
      await this.notifyProjectCompleted(project.workspaceId, project.name);
    }

    await this.auditQueueService.enqueue({
      workspaceId,
      userId: requestingUserId,
      action: 'project.created',
      entityType: 'project',
      entityId: project.id,
      oldData: null,
      newData: project,
    });

    return project;
  }

  async findAll(
    workspaceId: string,
    query: ListProjectsQueryDto,
  ): Promise<PaginatedProjects> {
    if (
      query.dateFrom &&
      query.dateTo &&
      new Date(query.dateTo) < new Date(query.dateFrom)
    ) {
      throw new BadRequestException(
        'Bitiş tarihi başlangıç tarihinden önce olamaz.',
      );
    }

    if (this.projectsSearchService) {
      try {
        return await this.projectsSearchService.findAll(workspaceId, query);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Redis project search failed; falling back to PostgreSQL: ${message}`,
        );
      }
    }

    const conditions = ['p.workspace_id = $1', 'p.deleted_at IS NULL'];
    const params: unknown[] = [workspaceId];

    if (query.search) {
      params.push(`%${query.search}%`);
      const searchIndex = params.length;
      conditions.push(
        `(p.name ILIKE $${searchIndex} OR COALESCE(p.description, '') ILIKE $${searchIndex})`,
      );
    }

    if (query.status) {
      params.push(query.status);
      conditions.push(`p.status = $${params.length}`);
    }

    if (query.dateFrom) {
      params.push(query.dateFrom);
      conditions.push(`p.created_at >= $${params.length}::date`);
    }

    if (query.dateTo) {
      params.push(query.dateTo);
      conditions.push(
        `p.created_at < ($${params.length}::date + INTERVAL '1 day')`,
      );
    }

    const whereClause = conditions.join(' AND ');
    const countResult = await this.dbService.query<ProjectCountRow>(
      `
        SELECT COUNT(*) AS total
        FROM projects p
        WHERE ${whereClause}
      `,
      params,
    );
    const total = Number(countResult.rows[0]?.total ?? 0);

    const sortColumns: Record<ListProjectsQueryDto['sort'], string> = {
      name: 'p.name',
      status: 'p.status',
      created_at: 'p.created_at',
      start_date: 'p.start_date',
      due_date: 'p.due_date',
    };
    const sortColumn = sortColumns[query.sort];
    const sortOrder = query.order === 'asc' ? 'ASC' : 'DESC';
    const offset = (query.page - 1) * query.limit;
    const dataParams = [...params, query.limit, offset];
    const limitIndex = params.length + 1;
    const offsetIndex = params.length + 2;

    const projectsResult = await this.dbService.query<ProjectRow>(
      `
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
        WHERE ${whereClause}
        ORDER BY ${sortColumn} ${sortOrder} NULLS LAST, p.id ASC
        LIMIT $${limitIndex}
        OFFSET $${offsetIndex}
      `,
      dataParams,
    );

    return {
      data: projectsResult.rows,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }
  async findOne(projectId: string): Promise<ProjectRow> {
    const result = await this.dbService.query<ProjectRow>(
      `
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
        WHERE p.id = $1 AND p.deleted_at IS NULL
      `,
      [projectId],
    );
    const project = result.rows[0];

    if (!project) {
      throw new NotFoundException('Proje  bulunamadı.');
    }

    return project;
  }

  async update(
    projectId: string,
    requestingUserId: string,
    body: UpdateProjectDto,
  ): Promise<ProjectRow> {
    if (
      body.name === undefined &&
      body.description === undefined &&
      body.status === undefined &&
      body.startDate === undefined &&
      body.dueDate === undefined
    ) {
      throw new BadRequestException(
        'Güncellenecek en az bir alan gönderilmelidir.',
      );
    }

    const existingProject = await this.findOne(projectId);

    const startDate = body.startDate ?? existingProject.startDate;
    const dueDate = body.dueDate ?? existingProject.dueDate;

    if (startDate && dueDate && new Date(dueDate) < new Date(startDate)) {
      throw new BadRequestException(
        'Bitiş tarihi başlangıç tarihinden önce olamaz.',
      );
    }

    const result = await this.dbService.query<ProjectRow>(
      `
        UPDATE projects
        SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          status = COALESCE($3, status),
          start_date = COALESCE($4, start_date),
          due_date = COALESCE($5, due_date),
          updated_at = NOW()
        WHERE id = $6 AND deleted_at IS NULL
        RETURNING
          id,
          workspace_id AS "workspaceId",
          name,
          description,
          status,
          start_date AS "startDate",
          due_date AS "dueDate",
          created_by AS "createdBy",
          created_at AS "createdAt",
          updated_at AS "updatedAt",
          deleted_at AS "deletedAt"
      `,
      [
        body.name ?? null,
        body.description ?? null,
        body.status ?? null,
        body.startDate ?? null,
        body.dueDate ?? null,
        projectId,
      ],
    );
    const project = result.rows[0];

    if (!project) {
      throw new NotFoundException('Proje bulunamadı.');
    }

    if (
      project.status === 'completed' &&
      existingProject.status !== 'completed'
    ) {
      await this.notifyProjectCompleted(project.workspaceId, project.name);
    }

    await this.auditQueueService.enqueue({
      workspaceId: project.workspaceId,
      userId: requestingUserId,
      action: 'project.updated',
      entityType: 'project',
      entityId: project.id,
      oldData: existingProject,
      newData: project,
    });

    return project;
  }

  async remove(
    projectId: string,
    requestingUserId: string,
  ): Promise<{ message: string }> {
    const existingProject = await this.findOne(projectId);
    const result = await this.dbService.query<{ id: string }>(
      `
        UPDATE projects
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id
      `,
      [projectId],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('Proje bulunamadı.');
    }

    await this.auditQueueService.enqueue({
      workspaceId: existingProject.workspaceId,
      userId: requestingUserId,
      action: 'project.deleted',
      entityType: 'project',
      entityId: projectId,
      oldData: existingProject,
      newData: null,
    });

    return { message: 'Proje silindi.' };
  }

  private async notifyProjectCompleted(
    workspaceId: string,
    projectName: string,
  ): Promise<void> {
    const membersResult = await this.dbService.query<WorkspaceMemberUserRow>(
      `
          SELECT user_id AS "userId"
          FROM workspace_members
          WHERE workspace_id = $1
        `,
      [workspaceId],
    );

    await Promise.all(
      membersResult.rows.map((member) =>
        this.notificationQueueService.enqueue(
          member.userId,
          'project_completed',
          'Proje tamamlandı',
          `"${projectName}" projesi tamamlandı.`,
        ),
      ),
    );
  }
}
