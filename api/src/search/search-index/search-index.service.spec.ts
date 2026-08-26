import 'reflect-metadata';
import type { RedisClientType } from 'redis';
import { SearchIndexService } from './search-index.service';

describe('SearchIndexService', () => {
  it('creates versioned indexes when Redis 8 reports SEARCH_INDEX_NOT_FOUND', async () => {
    const ft = {
      info: jest
        .fn()
        .mockRejectedValue(
          new Error('SEARCH_INDEX_NOT_FOUND Index not found: test'),
        ),
      create: jest.fn().mockResolvedValue('OK'),
      aliasAdd: jest.fn().mockResolvedValue('OK'),
      aliasUpdate: jest.fn().mockResolvedValue('OK'),
    };
    const service = new SearchIndexService({
      ft,
    } as unknown as RedisClientType);

    await service.ensureIndexes();

    expect(ft.create).toHaveBeenCalledTimes(2);
    expect(ft.aliasAdd).toHaveBeenCalledWith('idx:projects', 'idx:projects:v2');
    expect(ft.aliasAdd).toHaveBeenCalledWith('idx:tasks', 'idx:tasks:v2');
  });
});
