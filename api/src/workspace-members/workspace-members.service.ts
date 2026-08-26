import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditQueueService } from '../audit/audit-queue.service';
import { DbService } from '../database/db.service';
import { MailQueueService } from '../mail/mail-queue.service';
import { NotificationQueueService } from '../notifications/notification-queue.service';
import { AddWorkspaceMemberDto } from './dto/add-workspace-member.dto';
import { UpdateWorkspaceMemberDto } from './dto/update-workspace-member.dto';

export type WorkspaceRole = 'owner' | 'admin' | 'member';

interface UserRow {
  id: string;
  email: string;
  workspaceName: string;
}

interface MembershipRoleRow {
  role: WorkspaceRole;
}

export interface WorkspaceMemberRow {
  id: string;
  workspaceId: string;
  userId: string;
  email: string;
  role: WorkspaceRole;
  joinedAt: Date;
}
interface MemberIdentityRow {
  userId: string;
  role: WorkspaceRole;
}

@Injectable()
export class WorkspaceMembersService {
  constructor(
    private readonly dbService: DbService,
    private readonly notificationQueueService: NotificationQueueService,
    private readonly mailQueueService: MailQueueService,
    private readonly auditQueueService: AuditQueueService,
  ) {}

  async create(
    workspaceId: string,
    requestingUserId: string,
    body: AddWorkspaceMemberDto,
  ): Promise<WorkspaceMemberRow> {
    await this.assertCanManageMembers(workspaceId, requestingUserId);

    const userResult = await this.dbService.query<UserRow>(
      `
        SELECT
          u.id,
          u.email,
          w.name AS "workspaceName"
        FROM users u
        INNER JOIN workspaces w ON w.id = $2
        WHERE
          u.email = $1
          AND u.is_active = TRUE
          AND w.deleted_at IS NULL
      `,
      [body.email, workspaceId],
    );
    const user = userResult.rows[0];

    if (!user) {
      throw new NotFoundException('Eklenecek kullanıcı bulunamadı.');
    }

    try {
      const result = await this.dbService.query<WorkspaceMemberRow>(
        `
          WITH inserted_member AS (
            INSERT INTO workspace_members (workspace_id, user_id, role)
            VALUES ($1, $2, $3)
            RETURNING id, workspace_id, user_id, role, joined_at
          )
          SELECT
            im.id,
            im.workspace_id AS "workspaceId",
            im.user_id AS "userId",
            u.email,
            im.role,
            im.joined_at AS "joinedAt"
          FROM inserted_member im
          INNER JOIN users u ON u.id = im.user_id
        `,
        [workspaceId, user.id, body.role],
      );
      const member = result.rows[0];

      await this.notificationQueueService.enqueue(
        user.id,
        'workspace_member_added',
        'Çalışma alanına eklendiniz',
        'Yeni bir çalışma alanına üye olarak eklendiniz.',
      );

      await this.mailQueueService.enqueueWorkspaceMemberAdded(
        user.email,
        user.workspaceName,
      );

      await this.auditQueueService.enqueue({
        workspaceId,
        userId: requestingUserId,
        action: 'workspace_member.added',
        entityType: 'workspace_member',
        entityId: member.id,
        oldData: null,
        newData: member,
      });

      return member;
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Kullanıcı bu çalışma alanına zaten üye.');
      }

      throw error;
    }
  }

  async update(
    workspaceId: string,
    memberId: string,
    requestingUserId: string,
    body: UpdateWorkspaceMemberDto,
  ): Promise<WorkspaceMemberRow> {
    await this.assertCanManageMembers(workspaceId, requestingUserId);

    const memberResult = await this.dbService.query<MembershipRoleRow>(
      `
        SELECT wm.role
        FROM workspace_members wm
        INNER JOIN workspaces w ON w.id = wm.workspace_id
        WHERE
          wm.id = $1
          AND wm.workspace_id = $2
          AND w.deleted_at IS NULL
      `,
      [memberId, workspaceId],
    );
    const member = memberResult.rows[0];

    if (!member) {
      throw new NotFoundException('Çalışma alanı üyesi bulunamadı.');
    }

    if (member.role === 'owner') {
      throw new ForbiddenException(
        'Çalışma alanı sahibinin rolü değiştirilemez.',
      );
    }

    const result = await this.dbService.query<WorkspaceMemberRow>(
      `
        WITH updated_member AS (
          UPDATE workspace_members
          SET role = $1
          WHERE id = $2 AND workspace_id = $3
          RETURNING id, workspace_id, user_id, role, joined_at
        )
        SELECT
          um.id,
          um.workspace_id AS "workspaceId",
          um.user_id AS "userId",
          u.email,
          um.role,
          um.joined_at AS "joinedAt"
        FROM updated_member um
        INNER JOIN users u ON u.id = um.user_id
      `,
      [body.role, memberId, workspaceId],
    );
    const updatedMember = result.rows[0];

    if (!updatedMember) {
      throw new NotFoundException('Çalışma alanı üyesi bulunamadı.');
    }

    await this.auditQueueService.enqueue({
      workspaceId,
      userId: requestingUserId,
      action: 'workspace_member.role_changed',
      entityType: 'workspace_member',
      entityId: memberId,
      oldData: { id: memberId, workspaceId, role: member.role },
      newData: updatedMember,
    });

    return updatedMember;
  }

  private async assertCanManageMembers(
    workspaceId: string,
    requestingUserId: string,
  ): Promise<void> {
    const membershipResult = await this.dbService.query<MembershipRoleRow>(
      `
        SELECT wm.role
        FROM workspace_members wm
        INNER JOIN workspaces w ON w.id = wm.workspace_id
        WHERE
          wm.workspace_id = $1
          AND wm.user_id = $2
          AND w.deleted_at IS NULL
      `,
      [workspaceId, requestingUserId],
    );
    const requestingMembership = membershipResult.rows[0];

    if (!requestingMembership) {
      throw new NotFoundException('Çalışma alanı bulunamadı.');
    }

    if (!['owner', 'admin'].includes(requestingMembership.role)) {
      throw new ForbiddenException(
        'Bu işlem yalnızca çalışma alanı sahibi veya yöneticisi tarafından yapılabilir.',
      );
    }
  }
  async findAll(
    workspaceId: string,
    requestingUserId: string,
  ): Promise<WorkspaceMemberRow[]> {
    await this.assertWorkspaceMember(workspaceId, requestingUserId);

    const memberResults = await this.dbService.query<WorkspaceMemberRow>(
      `
        SELECT w.id,w.workspace_id AS "workspaceId",w.user_id AS "userId", u.email,w.role,w.joined_at AS "joinedAt"
        FROM users u
        INNER JOIN workspace_members w ON u.id = w.user_id
        WHERE w.workspace_id  = $1
       `,
      [workspaceId],
    );
    const member = memberResults.rows;

    return member;
  }

  private async assertWorkspaceMember(
    workspaceId: string,
    requestingUserId: string,
  ): Promise<void> {
    const result = await this.dbService.query<MembershipRoleRow>(
      `
        SELECT wm.role
        FROM workspace_members wm
        INNER JOIN workspaces w ON w.id = wm.workspace_id
        WHERE
          wm.workspace_id = $1
          AND wm.user_id = $2
          AND w.deleted_at IS NULL
      `,
      [workspaceId, requestingUserId],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('Çalışma alanı bulunamadı.');
    }
  }

  async remove(
    workspaceId: string,
    memberId: string,
    requestingUserId: string,
  ): Promise<{ message: string }> {
    await this.assertCanManageMembers(workspaceId, requestingUserId);
    const memberResult = await this.dbService.query<MemberIdentityRow>(
      `
        SELECT wm.user_id AS "userId",wm.role
        FROM workspace_members wm
        INNER JOIN workspaces w ON w.id = wm.workspace_id
        WHERE
          wm.id = $1
          AND wm.workspace_id = $2
          AND w.deleted_at IS NULL
      `,
      [memberId, workspaceId],
    );
    const member = memberResult.rows[0];
    if (!member) {
      throw new NotFoundException('Çalışma alanı üyesi bulunamadı.');
    }

    if (member.role === 'owner') {
      throw new ForbiddenException(
        'Çalışma alanı sahibi üyelikten çıkarılamaz.',
      );
    }
    const client = await this.dbService.getClient();
    let transactionStarted = false;

    try {
      await client.query('BEGIN');
      transactionStarted = true;

      await client.query(
        `
          UPDATE tasks t
          SET assigned_to = NULL, updated_at = NOW()
          FROM projects p
          WHERE
            t.project_id = p.id
            AND p.workspace_id = $1
            AND p.deleted_at IS NULL
            AND t.assigned_to = $2
            AND t.status <> 'completed'
            AND t.deleted_at IS NULL
        `,
        [workspaceId, member.userId],
      );

      const deleteResult = await client.query<{ id: string }>(
        `
          DELETE FROM workspace_members
          WHERE id = $1 AND workspace_id = $2
          RETURNING id
        `,
        [memberId, workspaceId],
      );

      if (!deleteResult.rows[0]) {
        throw new NotFoundException('Çalışma alanı üyesi bulunamadı.');
      }

      await client.query('COMMIT');
      transactionStarted = false;

      await this.auditQueueService.enqueue({
        workspaceId,
        userId: requestingUserId,
        action: 'workspace_member.removed',
        entityType: 'workspace_member',
        entityId: memberId,
        oldData: member,
        newData: null,
      });

      return { message: 'Üye çalışma alanından çıkarıldı.' };
    } catch (error: unknown) {
      if (transactionStarted) {
        await client.query('ROLLBACK');
      }

      throw error;
    } finally {
      client.release();
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    );
  }
}
