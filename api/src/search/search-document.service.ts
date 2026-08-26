import { Inject, Injectable } from '@nestjs/common';
import { RedisToken } from '@nestjs-redis/client';
import type { RedisClientType } from 'redis';
import type { ProjectRow } from '../projects/projects.service';
import type { TaskRow } from '../tasks/tasks.service';
import {
  NULL_DATE_ASC,
  NULL_DATE_DESC,
  PROJECT_SEARCH_PREFIX,
  TASK_SEARCH_PREFIX,
} from './search.constants';

@Injectable()
export class SearchDocumentService {
  constructor(@Inject(RedisToken()) private readonly redis: RedisClientType) {}

  async upsertProject(project: ProjectRow): Promise<void> {
    const startDate = this.toTimestamp(project.startDate);
    const dueDate = this.toTimestamp(project.dueDate);
    const document: Record<string, string> = {
      id: String(project.id),
      workspaceId: String(project.workspaceId),
      name: String(project.name),
      description: project.description ?? '',
      status: String(project.status),
      startDateValue: this.toDateOnlyValue(project.startDate),
      dueDateValue: this.toDateOnlyValue(project.dueDate),
      createdBy: String(project.createdBy),
      createdAt: String(this.toTimestamp(project.createdAt)),
      updatedAt: String(this.toTimestamp(project.updatedAt)),
      startDateSortAsc: String(startDate ?? NULL_DATE_ASC),
      startDateSortDesc: String(startDate ?? NULL_DATE_DESC),
      dueDateSortAsc: String(dueDate ?? NULL_DATE_ASC),
      dueDateSortDesc: String(dueDate ?? NULL_DATE_DESC),
    };

    if (startDate !== null) {
      document.startDate = String(startDate);
    }

    if (dueDate !== null) {
      document.dueDate = String(dueDate);
    }

    await this.replaceHash(`${PROJECT_SEARCH_PREFIX}${project.id}`, document);
  }

  async upsertTask(task: TaskRow): Promise<void> {
    const dueDate = this.toTimestamp(task.dueDate);
    const document: Record<string, string> = {
      id: String(task.id),
      projectId: String(task.projectId),
      title: String(task.title),
      description: task.description ?? '',
      status: String(task.status),
      priority: String(task.priority),
      dueDateValue: task.dueDate ? new Date(task.dueDate).toISOString() : '',
      createdBy: String(task.createdBy),
      assignedTo: task.assignedTo ?? '',
      createdAt: String(this.toTimestamp(task.createdAt)),
      updatedAt: String(this.toTimestamp(task.updatedAt)),
      dueDateSortAsc: String(dueDate ?? NULL_DATE_ASC),
      dueDateSortDesc: String(dueDate ?? NULL_DATE_DESC),
    };

    if (dueDate !== null) {
      document.dueDate = String(dueDate);
    }

    await this.replaceHash(`${TASK_SEARCH_PREFIX}${task.id}`, document);
  }
  async deleteProject(projectId: string): Promise<void> {
    await this.redis.del(`${PROJECT_SEARCH_PREFIX}${projectId}`);
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.redis.del(`${TASK_SEARCH_PREFIX}${taskId}`);
  }

  private async replaceHash(
    key: string,
    document: Record<string, string>,
  ): Promise<void> {
    await this.redis.multi().del(key).hSet(key, document).exec();
  }

  private toTimestamp(value: Date | string | null): number | null {
    if (value === null) {
      return null;
    }

    const timestamp = new Date(value).getTime();

    if (!Number.isFinite(timestamp)) {
      throw new Error(`Invalid date value for Redis Search: ${String(value)}`);
    }

    return timestamp;
  }

  private toDateOnlyValue(value: Date | string | null): string {
    if (value === null) {
      return '';
    }

    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    return String(value).slice(0, 10);
  }
}
