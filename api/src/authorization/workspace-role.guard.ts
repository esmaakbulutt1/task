import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isUUID } from 'class-validator';
import type { Request } from 'express';
import { DbService } from '../database/db.service';
import { MEMBER_TASK_ASSIGNEE_KEY } from './member-task-assignee.decorator';
import { WORKSPACE_ROLES_KEY } from './workspace-roles.decorator';
import type { WorkspaceRole } from './workspace-role.type';

interface WorkspaceRoleRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

interface WorkspaceMembershipRow {
  role: WorkspaceRole;
}

interface ProjectWorkspaceRow {
  workspaceId: string;
}

interface TaskWorkspaceRow extends ProjectWorkspaceRow {
  assignedTo: string | null;
}

type CommentWorkspaceRow = ProjectWorkspaceRow;

type AttachmentWorkspaceRow = ProjectWorkspaceRow;

@Injectable()
export class WorkspaceRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly dbService: DbService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(
      WORKSPACE_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const memberTaskAssigneeRequired =
      this.reflector.getAllAndOverride<boolean>(MEMBER_TASK_ASSIGNEE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    const request = context.switchToHttp().getRequest<WorkspaceRoleRequest>();
    let workspaceId = request.params.workspaceId;
    let taskAssigneeId: string | null | undefined;
    const projectId = request.params.projectId;
    const taskId = request.params.taskId;
    const commentId = request.params.commentId;
    const attachmentId = request.params.attachmentId;
    const userId = request.user?.id;

    this.assertUuidParam('workspaceId', workspaceId);
    this.assertUuidParam('projectId', projectId);
    this.assertUuidParam('taskId', taskId);
    this.assertUuidParam('commentId', commentId);
    this.assertUuidParam('attachmentId', attachmentId);

    if (!userId) {
      throw new UnauthorizedException('Giriş yapan kullanıcı bulunamadı.');
    }

    if (!workspaceId && projectId) {
      const projectResult = await this.dbService.query<ProjectWorkspaceRow>(
        `
            SELECT workspace_id AS "workspaceId"
            FROM projects
            WHERE id = $1 AND deleted_at IS NULL
          `,
        [projectId],
      );
      const project = projectResult.rows[0];

      if (!project) {
        throw new NotFoundException('Proje bulunamadı.');
      }

      workspaceId = project.workspaceId;
    }

    if (!workspaceId && taskId) {
      const taskResult = await this.dbService.query<TaskWorkspaceRow>(
        `
          SELECT
            p.workspace_id AS "workspaceId",
            t.assigned_to AS "assignedTo"
          FROM tasks t
          INNER JOIN projects p ON p.id = t.project_id
          WHERE
            t.id = $1
            AND t.deleted_at IS NULL
            AND p.deleted_at IS NULL
        `,
        [taskId],
      );
      const task = taskResult.rows[0];

      if (!task) {
        throw new NotFoundException('Görev bulunamadı.');
      }

      workspaceId = task.workspaceId;
      taskAssigneeId = task.assignedTo;
    }

    if (!workspaceId && commentId) {
      const commentResult = await this.dbService.query<CommentWorkspaceRow>(
        `
          SELECT p.workspace_id AS "workspaceId"
          FROM comments c
          INNER JOIN tasks t ON t.id = c.task_id
          INNER JOIN projects p ON p.id = t.project_id
          WHERE
            c.id = $1
            AND c.deleted_at IS NULL
            AND t.deleted_at IS NULL
            AND p.deleted_at IS NULL
        `,
        [commentId],
      );
      const comment = commentResult.rows[0];

      if (!comment) {
        throw new NotFoundException('Yorum bulunamadı.');
      }

      workspaceId = comment.workspaceId;
    }

    if (!workspaceId && attachmentId) {
      const attachmentResult =
        await this.dbService.query<AttachmentWorkspaceRow>(
          `
            SELECT p.workspace_id AS "workspaceId"
            FROM attachments a
            INNER JOIN tasks t ON t.id = a.task_id
            INNER JOIN projects p ON p.id = t.project_id
            WHERE
              a.id = $1
              AND t.deleted_at IS NULL
              AND p.deleted_at IS NULL
          `,
          [attachmentId],
        );
      const attachment = attachmentResult.rows[0];

      if (!attachment) {
        throw new NotFoundException('Dosya bulunamadı.');
      }

      workspaceId = attachment.workspaceId;
    }

    if (!workspaceId) {
      throw new BadRequestException('Workspace ID gerekli.');
    }

    const result = await this.dbService.query<WorkspaceMembershipRow>(
      `
        SELECT wm.role
        FROM workspace_members wm
        INNER JOIN workspaces w ON w.id = wm.workspace_id
        WHERE
          wm.workspace_id = $1
          AND wm.user_id = $2
          AND w.deleted_at IS NULL
      `,
      [workspaceId, userId],
    );
    const membership = result.rows[0];

    if (!membership) {
      throw new ForbiddenException('Bu çalışma alanına erişim yetkiniz yok.');
    }

    if (!requiredRoles.includes(membership.role)) {
      throw new ForbiddenException(
        'Bu işlem için gerekli role sahip değilsiniz.',
      );
    }

    if (memberTaskAssigneeRequired && membership.role === 'member') {
      if (taskAssigneeId !== userId) {
        throw new ForbiddenException(
          'Yalnızca size atanmış görevleri güncelleyebilirsiniz.',
        );
      }

      const requestBody = request.body as unknown;

      if (
        typeof requestBody === 'object' &&
        requestBody !== null &&
        'assignedTo' in requestBody
      ) {
        throw new ForbiddenException(
          'Member rolündeki kullanıcı görev atamasını değiştiremez.',
        );
      }
    }

    return true;
  }

  private assertUuidParam(
    name: string,
    value: string | string[] | undefined,
  ): void {
    if (Array.isArray(value) || (value !== undefined && !isUUID(value))) {
      throw new BadRequestException(`${name} geçerli bir UUID olmalıdır.`);
    }
  }
}
