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
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspacesService } from './workspaces.service';

@Controller('workspaces')
@UseGuards(AuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.workspacesService.findAll(req.user.id);
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: CreateWorkspaceDto) {
    return this.workspacesService.create(req.user.id, body);
  }

  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.update(id, req.user.id, body);
  }

  @Delete(':id')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) workspaceId: string,
  ) {
    return this.workspacesService.remove(workspaceId, req.user.id);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) workspaceId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.workspacesService.findOne(workspaceId, req.user.id);
  }
}
