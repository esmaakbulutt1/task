import {
  BadRequestException,
  type ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import type { DbService } from '../database/db.service';
import { WorkspaceRoleGuard } from './workspace-role.guard';

describe('WorkspaceRoleGuard', () => {
  const getAllAndOverride = jest.fn();
  const query = jest.fn();
  const guard = new WorkspaceRoleGuard(
    { getAllAndOverride } as unknown as Reflector,
    { query } as unknown as DbService,
  );

  const createContext = (workspaceId: string) => {
    const request = {
      params: { workspaceId },
      body: {},
      user: { id: 'user-id', email: 'user@example.com' },
    } as unknown as Request;

    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}) as Response,
      }),
      getHandler: () => function handler() {},
      getClass: () => class Controller {},
    } as ExecutionContext;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getAllAndOverride
      .mockReturnValueOnce(['owner', 'admin', 'member'])
      .mockReturnValueOnce(false);
  });

  it('allows a workspace member when the route accepts their role', async () => {
    query.mockResolvedValue({ rows: [{ role: 'member' }] });

    await expect(
      guard.canActivate(createContext('37bcecef-44e1-4c46-8b51-17a65fc77adf')),
    ).resolves.toBe(true);
    expect(query).toHaveBeenCalledWith(expect.any(String), [
      '37bcecef-44e1-4c46-8b51-17a65fc77adf',
      'user-id',
    ]);
  });

  it('rejects a role that the endpoint does not permit', async () => {
    getAllAndOverride.mockReset();
    getAllAndOverride
      .mockReturnValueOnce(['owner', 'admin'])
      .mockReturnValueOnce(false);
    query.mockResolvedValue({ rows: [{ role: 'member' }] });

    await expect(
      guard.canActivate(createContext('37bcecef-44e1-4c46-8b51-17a65fc77adf')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects malformed ids before querying PostgreSQL', async () => {
    await expect(
      guard.canActivate(createContext('not-a-uuid')),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(query).not.toHaveBeenCalled();
  });
});
