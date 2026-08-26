import { UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import type { DbService } from '../database/db.service';
import type { MailQueueService } from '../mail/mail-queue.service';
import { AuthService } from './auth.service';

jest.mock('pg-boss', () => ({ PgBoss: jest.fn() }));

describe('AuthService', () => {
  const query = jest.fn();
  const service = new AuthService(
    { query } as unknown as DbService,
    {} as JwtService,
    {} as MailQueueService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    { rows: [] },
    {
      rows: [
        {
          id: 'user-id',
          email: 'user@example.com',
          passwordHash: 'hash',
          isActive: false,
        },
      ],
    },
  ])(
    'uses the same login error for missing and inactive users',
    async (dbResult) => {
      query.mockResolvedValue(dbResult);

      await expect(
        service.login({ email: 'user@example.com', password: 'Password123!' }),
      ).rejects.toEqual(
        new UnauthorizedException('E-posta veya şifre hatalı.'),
      );
    },
  );
});
