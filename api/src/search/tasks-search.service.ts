import { Inject, Injectable } from '@nestjs/common';
import { RedisToken } from '@nestjs-redis/client';
import type { RedisClientType } from 'redis';
import type { ListTasksQueryDto } from '../tasks/dto/list-tasks-query.dto';
import type {
  PaginatedTasks,
  TaskPriority,
  TaskRow,
  TaskStatus,
} from '../tasks/tasks.service';
import { TASK_SEARCH_INDEX } from './search.constants';
import { SearchIndexService } from './search-index/search-index.service';
import {
  buildContainsQuery,
  dateRangeQuery,
  escapeTagValue,
  redisValueToString,
} from './search-query.utils';

@Injectable()
export class TasksSearchService {
  constructor(
    @Inject(RedisToken()) private readonly redis: RedisClientType,
    private readonly searchIndexService: SearchIndexService,
  ) {}

  async findAll(
    projectId: string,
    query: ListTasksQueryDto,
  ): Promise<PaginatedTasks> {
    await this.searchIndexService.ensureIndexes();

    const clauses = [`@projectId:{${escapeTagValue(projectId)}}`];

    if (query.search) {
      clauses.push(buildContainsQuery(query.search, ['title', 'description']));
    }

    if (query.status) {
      clauses.push(`@status:{${escapeTagValue(query.status)}}`);
    }

    if (query.priority) {
      clauses.push(`@priority:{${escapeTagValue(query.priority)}}`);
    }

    if (query.assignedTo) {
      clauses.push(`@assignedTo:{${escapeTagValue(query.assignedTo)}}`);
    }

    if (query.createdBy) {
      clauses.push(`@createdBy:{${escapeTagValue(query.createdBy)}}`);
    }

    const dueDateRange = dateRangeQuery(
      'dueDate',
      query.dueDateFrom,
      query.dueDateTo,
    );

    if (dueDateRange) {
      clauses.push(dueDateRange);
    }

    const sortFields: Record<ListTasksQueryDto['sort'], string> = {
      title: 'title',
      status: 'status',
      priority: 'priority',
      due_date: query.order === 'asc' ? 'dueDateSortAsc' : 'dueDateSortDesc',
      created_at: 'createdAt',
      updated_at: 'updatedAt',
    };
    const offset = (query.page - 1) * query.limit;
    const result = await this.redis.ft.search(
      TASK_SEARCH_INDEX,
      clauses.join(' '),
      {
        RETURN: [
          'id',
          'projectId',
          'title',
          'description',
          'status',
          'priority',
          'dueDateValue',
          'createdBy',
          'assignedTo',
          'createdAt',
          'updatedAt',
        ],
        SORTBY: {
          BY: sortFields[query.sort],
          DIRECTION: query.order === 'asc' ? 'ASC' : 'DESC',
        },
        LIMIT: { from: offset, size: query.limit },
        DIALECT: 2,
      },
    );

    return {
      data: result.documents.map(({ value }) => this.toTask(value)),
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    };
  }

  private toTask(value: Record<string, unknown>): TaskRow {
    return {
      id: redisValueToString(value.id),
      projectId: redisValueToString(value.projectId),
      title: redisValueToString(value.title),
      description: redisValueToString(value.description) || null,
      status: redisValueToString(value.status) as TaskStatus,
      priority: redisValueToString(value.priority) as TaskPriority,
      dueDate: redisValueToString(value.dueDateValue)
        ? new Date(redisValueToString(value.dueDateValue))
        : null,
      createdBy: redisValueToString(value.createdBy),
      assignedTo: redisValueToString(value.assignedTo) || null,
      createdAt: new Date(Number(value.createdAt)),
      updatedAt: new Date(Number(value.updatedAt)),
      deletedAt: null,
    };
  }
}
