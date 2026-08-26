import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { WorkspaceRoleGuard } from './workspace-role.guard';

@Module({
  imports: [DatabaseModule],
  providers: [WorkspaceRoleGuard],
  exports: [WorkspaceRoleGuard],
})
export class AuthorizationModule {}
