import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request.interface';
import { WorkspaceRoleGuard } from '../authorization/workspace-role.guard';
import { WorkspaceRoles } from '../authorization/workspace-roles.decorator';
import { AddWorkspaceMemberDto } from './dto/add-workspace-member.dto';
import { UpdateWorkspaceMemberDto } from './dto/update-workspace-member.dto';
import { WorkspaceMembersService } from './workspace-members.service';

@Controller('workspaces/:workspaceId/members')
@UseGuards(AuthGuard, WorkspaceRoleGuard)
export class WorkspaceMembersController {
  constructor(
    private readonly workspaceMembersService: WorkspaceMembersService,
  ) {}

  @Get()
  @WorkspaceRoles('owner', 'admin', 'member')
  findAll(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.workspaceMembersService.findAll(workspaceId, req.user.id);
  }

  @Post()
  @WorkspaceRoles('owner', 'admin')
  create(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: AddWorkspaceMemberDto,
  ) {
    return this.workspaceMembersService.create(workspaceId, req.user.id, body);
  }

  @Patch(':memberId')
  @WorkspaceRoles('owner', 'admin')
  update(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdateWorkspaceMemberDto,
  ) {
    return this.workspaceMembersService.update(
      workspaceId,
      memberId,
      req.user.id,
      body,
    );
  }

  @Delete(':memberId')
  @WorkspaceRoles('owner', 'admin')
  remove(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.workspaceMembersService.remove(
      workspaceId,
      memberId,
      req.user.id,
    );
  }
}
