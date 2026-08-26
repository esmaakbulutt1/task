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
import { MemberTaskAssignee } from '../authorization/member-task-assignee.decorator';
import { WorkspaceRoleGuard } from '../authorization/workspace-role.guard';
import { WorkspaceRoles } from '../authorization/workspace-roles.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@Controller()
@UseGuards(AuthGuard, WorkspaceRoleGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('projects/:projectId/tasks')
  @WorkspaceRoles('owner', 'admin', 'member')
  findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: ListTasksQueryDto,
  ) {
    return this.tasksService.findAll(projectId, query);
  }

  @Post('projects/:projectId/tasks')
  @WorkspaceRoles('owner', 'admin')
  create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateTaskDto,
  ) {
    return this.tasksService.create(projectId, req.user.id, body);
  }

  @Get('tasks/:taskId')
  @WorkspaceRoles('owner', 'admin', 'member')
  findOne(@Param('taskId', ParseUUIDPipe) taskId: string) {
    return this.tasksService.findOne(taskId);
  }

  @Patch('tasks/:taskId')
  @WorkspaceRoles('owner', 'admin', 'member')
  @MemberTaskAssignee()
  update(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdateTaskDto,
  ) {
    return this.tasksService.update(taskId, req.user.id, body);
  }

  @Delete('tasks/:taskId')
  @WorkspaceRoles('owner', 'admin')
  remove(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.tasksService.remove(taskId, req.user.id);
  }
}
