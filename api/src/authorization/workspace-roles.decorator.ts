import { SetMetadata } from '@nestjs/common'; //endpointin üzerine bilgi koycak araç
import type { WorkspaceRole } from './workspace-role.type';

export const WORKSPACE_ROLES_KEY = 'workspaceRoles';
export const WorkspaceRoles = (...roles: WorkspaceRole[]) =>
  SetMetadata(WORKSPACE_ROLES_KEY, roles);
