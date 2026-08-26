import 'reflect-metadata';
import type { RedisClientType } from 'redis';
import type { ProjectRow } from '../projects/projects.service';
import type { TaskRow } from '../tasks/tasks.service';
import { NULL_DATE_ASC, NULL_DATE_DESC } from './search.constants';
import { SearchDocumentService } from './search-document.service';

describe('SearchDocumentService', () => {
  it('serializes project dates and null sort values for Redis hashes', async () => {
    const transaction = {
      del: jest.fn(),
      hSet: jest.fn(),
      exec: jest.fn().mockResolvedValue([]),
    };
    transaction.del.mockReturnValue(transaction);
    transaction.hSet.mockReturnValue(transaction);
    const redis = {
      multi: jest.fn().mockReturnValue(transaction),
    } as unknown as RedisClientType;
    const service = new SearchDocumentService(redis);
    const project: ProjectRow = {
      id: 'project-id',
      workspaceId: 'workspace-id',
      name: 'Redis projesi',
      description: null,
      status: 'active',
      startDate: '2026-08-20',
      dueDate: null,
      createdBy: 'user-id',
      createdAt: new Date('2026-08-20T10:00:00.000Z'),
      updatedAt: new Date('2026-08-21T10:00:00.000Z'),
      deletedAt: null,
    };

    await service.upsertProject(project);

    expect(transaction.hSet).toHaveBeenCalledWith(
      'search:project:project-id',
      expect.objectContaining({
        startDateValue: '2026-08-20',
        dueDateValue: '',
        dueDateSortAsc: String(NULL_DATE_ASC),
        dueDateSortDesc: String(NULL_DATE_DESC),
        createdAt: String(Date.parse('2026-08-20T10:00:00.000Z')),
      }),
    );
    const document = transaction.hSet.mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect(
      Object.values(document).every((value) => typeof value === 'string'),
    ).toBe(true);
  });

  it('serializes PostgreSQL Date objects and null sort values for Redis hashes', async () => {
    const transaction = {
      del: jest.fn(),
      hSet: jest.fn(),
      exec: jest.fn().mockResolvedValue([]),
    };
    transaction.del.mockReturnValue(transaction);
    transaction.hSet.mockReturnValue(transaction);
    const redis = {
      multi: jest.fn().mockReturnValue(transaction),
    } as unknown as RedisClientType;
    const service = new SearchDocumentService(redis);
    const task: TaskRow = {
      id: 'task-id',
      projectId: 'project-id',
      title: 'Redis görevi',
      description: null,
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      createdBy: 'user-id',
      assignedTo: null,
      createdAt: new Date('2026-08-20T10:00:00.000Z'),
      updatedAt: new Date('2026-08-21T10:00:00.000Z'),
      deletedAt: null,
    };

    await service.upsertTask(task);

    expect(transaction.hSet).toHaveBeenCalledWith(
      'search:task:task-id',
      expect.objectContaining({
        dueDateValue: '',
        dueDateSortAsc: String(NULL_DATE_ASC),
        dueDateSortDesc: String(NULL_DATE_DESC),
        createdAt: String(Date.parse('2026-08-20T10:00:00.000Z')),
      }),
    );
    const document = transaction.hSet.mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect(
      Object.values(document).every((value) => typeof value === 'string'),
    ).toBe(true);
  });
});
