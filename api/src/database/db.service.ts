import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import type { PoolClient, QueryResult, QueryResultRow } from 'pg';

@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly logger = new Logger(DbService.name);
  private readonly pool: Pool;

  constructor() {
    const port = Number(this.getRequiredEnv('DATABASE_PORT'));

    if (!Number.isInteger(port) || port <= 0) {
      throw new Error('DATABASE_PORT must be a positive integer.');
    }

    this.pool = new Pool({
      host: this.getRequiredEnv('DATABASE_HOST'),
      port,
      user: this.getRequiredEnv('POSTGRES_USER'),
      password: this.getRequiredEnv('POSTGRES_PASSWORD'),
      database: this.getRequiredEnv('POSTGRES_DB'),
      max: 10,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
    });

    this.pool.on('error', (error: Error) => {
      this.logger.error(
        'Unexpected error on an idle PostgreSQL client.',
        error.stack,
      );
    });
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    try {
      return await this.pool.query<T>(text, params);
    } catch (error: unknown) {
      this.logError('PostgreSQL query failed.', error);
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    try {
      return await this.pool.connect();
    } catch (error: unknown) {
      this.logError('Could not acquire a PostgreSQL client.', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
    this.logger.log('PostgreSQL connection pool closed.');
  }

  private getRequiredEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
  }

  private logError(message: string, error: unknown): void {
    if (error instanceof Error) {
      this.logger.error(message, error.stack);
      return;
    }

    this.logger.error(message);
  }
}
