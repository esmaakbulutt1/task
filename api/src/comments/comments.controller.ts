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
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Controller()
@UseGuards(AuthGuard, WorkspaceRoleGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('tasks/:taskId/comments')
  @WorkspaceRoles('owner', 'admin', 'member')
  findAll(@Param('taskId', ParseUUIDPipe) taskId: string) {
    return this.commentsService.findAll(taskId);
  }

  @Post('tasks/:taskId/comments')
  @WorkspaceRoles('owner', 'admin', 'member')
  create(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateCommentDto,
  ) {
    return this.commentsService.create(taskId, req.user.id, body);
  }

  @Patch('comments/:commentId')
  @WorkspaceRoles('owner', 'admin', 'member')
  update(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdateCommentDto,
  ) {
    return this.commentsService.update(commentId, req.user.id, body);
  }

  @Delete('comments/:commentId')
  @WorkspaceRoles('owner', 'admin')
  remove(@Param('commentId', ParseUUIDPipe) commentId: string) {
    return this.commentsService.remove(commentId);
  }
}
