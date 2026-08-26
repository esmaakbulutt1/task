import { Inject, Injectable } from '@nestjs/common';
import { RedisToken } from '@nestjs-redis/client';
import type { RedisClientType } from 'redis';
import type { ListProjectsQueryDto } from '../projects/dto/list-projects-query.dto';
import type {
  PaginatedProjects,
  ProjectRow,
  ProjectStatus,
} from '../projects/projects.service';
import { PROJECT_SEARCH_INDEX } from './search.constants';
import { SearchIndexService } from './search-index/search-index.service';
import {
  buildContainsQuery,
  dateRangeQuery,
  escapeTagValue,
  redisValueToString,
} from './search-query.utils';

@Injectable()
export class ProjectsSearchService {
  constructor(
    @Inject(RedisToken()) private readonly redis: RedisClientType,
    private readonly searchIndexService: SearchIndexService,
  ) {}

  async findAll(
    workspaceId: string,
    query: ListProjectsQueryDto,
  ): Promise<PaginatedProjects> {
    await this.searchIndexService.ensureIndexes();

    const clauses = [`@workspaceId:{${escapeTagValue(workspaceId)}}`];

    if (query.search) {
      clauses.push(buildContainsQuery(query.search, ['name', 'description']));
    }

    if (query.status) {
      clauses.push(`@status:{${escapeTagValue(query.status)}}`);
    }

    const createdAtRange = dateRangeQuery(
      'createdAt',
      query.dateFrom,
      query.dateTo,
    );

    if (createdAtRange) {
      clauses.push(createdAtRange);
    }

    const sortFields: Record<ListProjectsQueryDto['sort'], string> = {
      name: 'name',
      status: 'status',
      created_at: 'createdAt',
      start_date:
        query.order === 'asc' ? 'startDateSortAsc' : 'startDateSortDesc',
      due_date: query.order === 'asc' ? 'dueDateSortAsc' : 'dueDateSortDesc',
    };
    const offset = (query.page - 1) * query.limit;
    const result = await this.redis.ft.search(
      PROJECT_SEARCH_INDEX,
      clauses.join(' '),
      {
        RETURN: [
          'id',
          'workspaceId',
          'name',
          'description',
          'status',
          'startDateValue',
          'dueDateValue',
          'createdBy',
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
      data: result.documents.map(({ value }) => this.toProject(value)),
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    };
  }

  private toProject(value: Record<string, unknown>): ProjectRow {
    return {
      id: redisValueToString(value.id),
      workspaceId: redisValueToString(value.workspaceId),
      name: redisValueToString(value.name),
      description: redisValueToString(value.description) || null,
      status: redisValueToString(value.status) as ProjectStatus,
      startDate: redisValueToString(value.startDateValue) || null,
      dueDate: redisValueToString(value.dueDateValue) || null,
      createdBy: redisValueToString(value.createdBy),
      createdAt: new Date(Number(value.createdAt)),
      updatedAt: new Date(Number(value.updatedAt)),
      deletedAt: null,
    };
  }
}
