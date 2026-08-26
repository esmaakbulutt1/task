export type AuditEntityType =
  'workspace' | 'workspace_member' | 'project' | 'task' | 'task_import';

export type AuditAction =
  | 'workspace.created'
  | 'workspace.updated'
  | 'workspace.deleted'
  | 'workspace_member.added'
  | 'workspace_member.role_changed'
  | 'workspace_member.removed'
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'task.created'
  | 'task.updated'
  | 'task.assigned'
  | 'task.status_changed'
  | 'task.deleted'
  | 'task_import.batch_inserted';

export interface AuditLogJobData {
  eventId: string;
  workspaceId: string;
  userId: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  oldData: object | null;
  newData: object | null;
  occurredAt: string;
}

export type EnqueueAuditLogData = Omit<
  AuditLogJobData,
  'eventId' | 'occurredAt'
>;
