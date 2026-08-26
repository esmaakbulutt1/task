import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request.interface';
import { WorkspaceRoleGuard } from '../authorization/workspace-role.guard';
import { WorkspaceRoles } from '../authorization/workspace-roles.decorator';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@Controller()
@UseGuards(AuthGuard, WorkspaceRoleGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('workspaces/:workspaceId/projects')
  @WorkspaceRoles('owner', 'admin', 'member')
  findAll(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Query() query: ListProjectsQueryDto,
  ) {
    return this.projectsService.findAll(workspaceId, query);
  }

  @Post('workspaces/:workspaceId/projects')
  @WorkspaceRoles('owner', 'admin')
  create(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateProjectDto,
  ) {
    return this.projectsService.create(workspaceId, req.user.id, body);
  }

  @Get('projects/:projectId')
  @WorkspaceRoles('owner', 'admin', 'member')
  findOne(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.projectsService.findOne(projectId);
  }

  @Patch('projects/:projectId')
  @WorkspaceRoles('owner', 'admin')
  update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdateProjectDto,
  ) {
    return this.projectsService.update(projectId, req.user.id, body);
  }

  @Delete('projects/:projectId')
  @WorkspaceRoles('owner', 'admin')
  remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.projectsService.remove(projectId, req.user.id);
  }
}
