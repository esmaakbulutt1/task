import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditQueueService } from '../audit/audit-queue.service';
import { DbService } from '../database/db.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

export type WorkspaceRole = 'owner' | 'admin' | 'member';

export interface WorkspaceRow {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface WorkspaceWithRoleRow extends WorkspaceRow {
  role: WorkspaceRole;
}

interface WorkspaceOwnerRow {
  ownerId: string;
  role: WorkspaceRole;
}

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly dbService: DbService,
    private readonly auditQueueService: AuditQueueService,
  ) {}

  async create(
    userId: string,
    body: CreateWorkspaceDto,
  ): Promise<WorkspaceWithRoleRow> {
    const client = await this.dbService.getClient();
    let transactionStarted = false;

    try {
      await client.query('BEGIN');
      transactionStarted = true;

      const workspaceResult = await client.query<WorkspaceRow>(
        `
          INSERT INTO workspaces (name, description, owner_id)
          VALUES ($1, $2, $3)
          RETURNING
            id,
            name,
            description,
            owner_id AS "ownerId",
            created_at AS "createdAt",
            updated_at AS "updatedAt",
            deleted_at AS "deletedAt"
        `,
        [body.name.trim(), body.description?.trim() || null, userId],
      );
      const workspace = workspaceResult.rows[0];

      await client.query(
        `
          INSERT INTO workspace_members (workspace_id, user_id, role)
          VALUES ($1, $2, 'owner')
        `,
        [workspace.id, userId],
      );

      await client.query('COMMIT');
      transactionStarted = false;

      const createdWorkspace: WorkspaceWithRoleRow = {
        ...workspace,
        role: 'owner',
      };

      await this.auditQueueService.enqueue({
        workspaceId: workspace.id,
        userId,
        action: 'workspace.created',
        entityType: 'workspace',
        entityId: workspace.id,
        oldData: null,
        newData: createdWorkspace,
      });

      return createdWorkspace;
    } catch (error: unknown) {
      if (transactionStarted) {
        await client.query('ROLLBACK');
      }

      throw error;
    } finally {
      client.release();
    }
  }

  async findAll(userId: string): Promise<WorkspaceWithRoleRow[]> {
    const result = await this.dbService.query<WorkspaceWithRoleRow>(
      `
        SELECT
          w.id,
          w.name,
          w.description,
          w.owner_id AS "ownerId",
          w.created_at AS "createdAt",
          w.updated_at AS "updatedAt",
          w.deleted_at AS "deletedAt",
          wm.role
        FROM workspaces w
        INNER JOIN workspace_members wm ON wm.workspace_id = w.id
        WHERE wm.user_id = $1 AND w.deleted_at IS NULL
        ORDER BY w.created_at DESC
      `,
      [userId],
    );

    return result.rows;
  }

  async findOne(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceWithRoleRow> {
    const result = await this.dbService.query<WorkspaceWithRoleRow>(
      `
        SELECT
          w.id,
          w.name,
          w.description,
          w.owner_id AS "ownerId",
          w.created_at AS "createdAt",
          w.updated_at AS "updatedAt",
          w.deleted_at AS "deletedAt",
          wm.role
        FROM workspaces w
        INNER JOIN workspace_members wm ON wm.workspace_id = w.id
        WHERE
          w.id = $1
          AND wm.user_id = $2
          AND w.deleted_at IS NULL
      `,
      [workspaceId, userId],
    );
    const workspace = result.rows[0];

    if (!workspace) {
      throw new NotFoundException('Çalışma alanı bulunamadı.');
    }

    return workspace;
  }

  async update(
    workspaceId: string,
    userId: string,
    body: UpdateWorkspaceDto,
  ): Promise<WorkspaceRow> {
    if (body.name === undefined && body.description === undefined) {
      throw new BadRequestException(
        'Güncellenecek en az bir alan gönderilmelidir.',
      );
    }

    await this.assertOwner(workspaceId, userId);
    const existingWorkspace = await this.findOne(workspaceId, userId);

    const result = await this.dbService.query<WorkspaceRow>(
      `
        UPDATE workspaces
        SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          updated_at = NOW()
        WHERE id = $3 AND deleted_at IS NULL
        RETURNING
          id,
          name,
          description,
          owner_id AS "ownerId",
          created_at AS "createdAt",
          updated_at AS "updatedAt",
          deleted_at AS "deletedAt"
      `,
      [body.name ?? null, body.description ?? null, workspaceId],
    );
    const workspace = result.rows[0];

    if (!workspace) {
      throw new NotFoundException('Çalışma alanı bulunamadı.');
    }

    await this.auditQueueService.enqueue({
      workspaceId,
      userId,
      action: 'workspace.updated',
      entityType: 'workspace',
      entityId: workspaceId,
      oldData: existingWorkspace,
      newData: workspace,
    });

    return workspace;
  }

  async remove(
    workspaceId: string,
    userId: string,
  ): Promise<{ message: string }> {
    await this.assertOwner(workspaceId, userId);
    const existingWorkspace = await this.findOne(workspaceId, userId);

    const result = await this.dbService.query<{ id: string }>(
      `
        UPDATE workspaces
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id
      `,
      [workspaceId],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('Çalışma alanı bulunamadı.');
    }

    await this.auditQueueService.enqueue({
      workspaceId,
      userId,
      action: 'workspace.deleted',
      entityType: 'workspace',
      entityId: workspaceId,
      oldData: existingWorkspace,
      newData: null,
    });

    return { message: 'Çalışma alanı silindi.' };
  }

  private async assertOwner(
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const result = await this.dbService.query<WorkspaceOwnerRow>(
      `
        SELECT
          w.owner_id AS "ownerId",
          wm.role
        FROM workspaces w
        INNER JOIN workspace_members wm ON wm.workspace_id = w.id
        WHERE
          w.id = $1
          AND wm.user_id = $2
          AND w.deleted_at IS NULL
      `,
      [workspaceId, userId],
    );
    const membership = result.rows[0];

    if (!membership) {
      throw new NotFoundException('Çalışma alanı bulunamadı.');
    }

    if (membership.role !== 'owner' || membership.ownerId !== userId) {
      throw new ForbiddenException(
        'Bu işlem yalnızca çalışma alanı sahibi tarafından yapılabilir.',
      );
    }
  }
}
