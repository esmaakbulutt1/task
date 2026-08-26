import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  const verifyAsync = jest.fn();
  const guard = new AuthGuard({ verifyAsync } as unknown as JwtService);

  const createContext = (authorization?: string) => {
    const request = {
      headers: authorization ? { authorization } : {},
    } as Request;
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}) as Response,
      }),
    } as ExecutionContext;

    return { context, request };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts a valid access token and attaches the user', async () => {
    verifyAsync.mockResolvedValue({
      sub: 'user-id',
      email: 'user@example.com',
      purpose: 'access',
    });
    const { context, request } = createContext('Bearer access-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verifyAsync).toHaveBeenCalledWith('access-token');
    expect(request).toMatchObject({
      user: { id: 'user-id', email: 'user@example.com' },
    });
  });

  it('rejects requests without a bearer token', async () => {
    const { context } = createContext();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(verifyAsync).not.toHaveBeenCalled();
  });

  it('rejects tokens that are not access tokens', async () => {
    verifyAsync.mockResolvedValue({
      sub: 'user-id',
      email: 'user@example.com',
      purpose: 'password-reset',
    });
    const { context } = createContext('Bearer reset-token');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
