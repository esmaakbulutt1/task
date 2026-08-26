import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisToken } from '@nestjs-redis/client';
import { SCHEMA_FIELD_TYPE, type RedisClientType } from 'redis';
import {
  PROJECT_SEARCH_INDEX,
  PROJECT_SEARCH_INDEX_VERSION,
  PROJECT_SEARCH_PREFIX,
  TASK_SEARCH_INDEX,
  TASK_SEARCH_INDEX_VERSION,
  TASK_SEARCH_PREFIX,
} from '../search.constants';

@Injectable()
export class SearchIndexService implements OnModuleInit {
  private readonly logger = new Logger(SearchIndexService.name);
  private initialization?: Promise<void>;

  constructor(@Inject(RedisToken()) private readonly redis: RedisClientType) {}

  async onModuleInit(): Promise<void> {
    await this.ensureIndexes();
  }

  ensureIndexes(): Promise<void> {
    this.initialization ??= this.initializeIndexes();
    return this.initialization;
  }

  private async initializeIndexes(): Promise<void> {
    await this.ensureProjectIndex();
    await this.ensureTaskIndex();

    this.logger.log('Redis Search indexes and aliases are ready.');
  }
  private async ensureProjectIndex(): Promise<void> {
    if (!(await this.indexExists(PROJECT_SEARCH_INDEX_VERSION))) {
      await this.redis.ft.create(
        PROJECT_SEARCH_INDEX_VERSION,
        {
          workspaceId: SCHEMA_FIELD_TYPE.TAG,

          name: {
            type: SCHEMA_FIELD_TYPE.TEXT,
            WEIGHT: 3,
            NOSTEM: true,
            WITHSUFFIXTRIE: true,
            SORTABLE: true,
          },

          description: {
            type: SCHEMA_FIELD_TYPE.TEXT,
            NOSTEM: true,
            WITHSUFFIXTRIE: true,
          },

          status: {
            type: SCHEMA_FIELD_TYPE.TAG,
            SORTABLE: true,
          },

          createdAt: {
            type: SCHEMA_FIELD_TYPE.NUMERIC,
            SORTABLE: true,
          },

          updatedAt: {
            type: SCHEMA_FIELD_TYPE.NUMERIC,
            SORTABLE: true,
          },

          startDate: SCHEMA_FIELD_TYPE.NUMERIC,
          dueDate: SCHEMA_FIELD_TYPE.NUMERIC,

          startDateSortAsc: {
            type: SCHEMA_FIELD_TYPE.NUMERIC,
            SORTABLE: true,
          },

          startDateSortDesc: {
            type: SCHEMA_FIELD_TYPE.NUMERIC,
            SORTABLE: true,
          },

          dueDateSortAsc: {
            type: SCHEMA_FIELD_TYPE.NUMERIC,
            SORTABLE: true,
          },

          dueDateSortDesc: {
            type: SCHEMA_FIELD_TYPE.NUMERIC,
            SORTABLE: true,
          },
        },
        {
          ON: 'HASH',
          PREFIX: PROJECT_SEARCH_PREFIX,
        },
      );

      this.logger.log(`Created ${PROJECT_SEARCH_INDEX_VERSION}.`);
    }

    await this.pointAlias(PROJECT_SEARCH_INDEX, PROJECT_SEARCH_INDEX_VERSION);
  }

  private async ensureTaskIndex(): Promise<void> {
    if (!(await this.indexExists(TASK_SEARCH_INDEX_VERSION))) {
      await this.redis.ft.create(
        TASK_SEARCH_INDEX_VERSION,
        {
          projectId: SCHEMA_FIELD_TYPE.TAG,
          title: {
            type: SCHEMA_FIELD_TYPE.TEXT,
            WEIGHT: 3,
            NOSTEM: true,
            WITHSUFFIXTRIE: true,
            SORTABLE: true,
          },
          description: {
            type: SCHEMA_FIELD_TYPE.TEXT,
            NOSTEM: true,
            WITHSUFFIXTRIE: true,
          },
          status: { type: SCHEMA_FIELD_TYPE.TAG, SORTABLE: true },
          priority: { type: SCHEMA_FIELD_TYPE.TAG, SORTABLE: true },
          assignedTo: SCHEMA_FIELD_TYPE.TAG,
          createdBy: SCHEMA_FIELD_TYPE.TAG,
          dueDate: SCHEMA_FIELD_TYPE.NUMERIC,
          createdAt: { type: SCHEMA_FIELD_TYPE.NUMERIC, SORTABLE: true },
          updatedAt: { type: SCHEMA_FIELD_TYPE.NUMERIC, SORTABLE: true },
          dueDateSortAsc: {
            type: SCHEMA_FIELD_TYPE.NUMERIC,
            SORTABLE: true,
          },
          dueDateSortDesc: {
            type: SCHEMA_FIELD_TYPE.NUMERIC,
            SORTABLE: true,
          },
        },
        { ON: 'HASH', PREFIX: TASK_SEARCH_PREFIX },
      );
      this.logger.log(`Created ${TASK_SEARCH_INDEX_VERSION}.`);
    }

    await this.pointAlias(TASK_SEARCH_INDEX, TASK_SEARCH_INDEX_VERSION);
  }

  private async indexExists(index: string): Promise<boolean> {
    try {
      await this.redis.ft.info(index);
      return true;
    } catch (error: unknown) {
      const message = this.errorMessage(error).toLowerCase();

      if (
        message.includes('unknown index') ||
        message.includes('index not found') ||
        message.includes('search_index_not_found')
      ) {
        return false;
      }

      throw error;
    }
  }

  private async pointAlias(alias: string, index: string): Promise<void> {
    try {
      await this.redis.ft.aliasAdd(alias, index);
    } catch (error: unknown) {
      const message = this.errorMessage(error).toLowerCase();

      if (!message.includes('alias') || !message.includes('exist')) {
        throw error;
      }

      await this.redis.ft.aliasUpdate(alias, index);
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
