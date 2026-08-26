import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { DbService } from '../database/db.service';
import { MailQueueService } from '../mail/mail-queue.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const PASSWORD_SALT_ROUNDS = 10;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

export interface UserProfileRow {
  id: string;
  email: string;
  name: string | null;
  surname: string | null;
  profileImage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface LoginUserRow {
  id: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
}

interface PasswordResetUserRow {
  id: string;
  email: string;
  isActive: boolean;
}

interface PasswordResetPayload {
  sub?: unknown;
  jti?: unknown;
  purpose?: unknown;
}

interface RefreshTokenRow {
  id: string;
  userId: string;
  email: string;
  isActive: boolean;
}

interface PasswordResetTokenRow {
  id: string;
  userId: string;
  passwordHash: string;
  isActive: boolean;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly dbService: DbService,
    private readonly jwtService: JwtService,
    private readonly mailQueueService: MailQueueService,
  ) {}

  async register(body: RegisterDto): Promise<UserProfileRow> {
    const email = body.email.trim().toLowerCase();
    const name = body.name.trim();
    const surname = body.surname.trim();

    const existingUser = await this.dbService.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [email],
    );

    if (existingUser.rowCount) {
      throw new ConflictException('Bu e-posta zaten kayıtlı.');
    }

    const passwordHash = await bcrypt.hash(body.password, PASSWORD_SALT_ROUNDS);

    try {
      const result = await this.dbService.query<UserProfileRow>(
        `
          INSERT INTO users (email, password_hash, name, surname)
          VALUES ($1, $2, $3, $4)
          RETURNING
            id,
            email,
            name,
            surname,
            profile_image AS "profileImage",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
        `,
        [email, passwordHash, name, surname],
      );

      return result.rows[0];
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Bu e-posta zaten kayıtlı.');
      }

      throw error;
    }
  }

  async login(body: LoginDto) {
    const email = body.email.trim().toLowerCase();
    const result = await this.dbService.query<LoginUserRow>(
      `
        SELECT
          id,
          email,
          password_hash AS "passwordHash",
          is_active AS "isActive"
        FROM users
        WHERE email = $1
      `,
      [email],
    );

    const user = result.rows[0];

    if (!user || !user.isActive) {
      throw new UnauthorizedException('E-posta veya şifre hatalı.');
    }

    const passwordMatches = await bcrypt.compare(
      body.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('E-posta veya şifre hatalı.');
    }

    const tokens = await this.createSession(user.id, user.email);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    if (!refreshToken) {
      throw new UnauthorizedException('Geçersiz yenileme tokenı.');
    }

    const tokenHash = this.hashToken(refreshToken);
    const client = await this.dbService.getClient();
    let transactionStarted = false;

    try {
      await client.query('BEGIN');
      transactionStarted = true;

      const result = await client.query<RefreshTokenRow>(
        `
          SELECT
            rt.id,
            rt.user_id AS "userId",
            u.email,
            u.is_active AS "isActive"
          FROM refresh_tokens rt
          INNER JOIN users u ON u.id = rt.user_id
          WHERE
            rt.token_hash = $1
            AND rt.revoked_at IS NULL
            AND rt.expires_at > NOW()
          FOR UPDATE OF rt
        `,
        [tokenHash],
      );
      const storedToken = result.rows[0];

      if (!storedToken || !storedToken.isActive) {
        throw new UnauthorizedException('Geçersiz yenileme tokenı.');
      }

      await client.query(
        `
          UPDATE refresh_tokens
          SET revoked_at = NOW()
          WHERE id = $1
        `,
        [storedToken.id],
      );

      const newRefreshToken = this.generateOpaqueToken();
      await client.query(
        `
          INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
          VALUES ($1, $2, $3)
        `,
        [
          storedToken.userId,
          this.hashToken(newRefreshToken),
          new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        ],
      );

      const accessToken = await this.createAccessToken(
        storedToken.userId,
        storedToken.email,
      );

      await client.query('COMMIT');
      transactionStarted = false;

      return {
        access_token: accessToken,
        refresh_token: newRefreshToken,
      };
    } catch (error: unknown) {
      if (transactionStarted) {
        await client.query('ROLLBACK');
      }

      throw error;
    } finally {
      client.release();
    }
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    if (refreshToken) {
      await this.dbService.query(
        `
          UPDATE refresh_tokens
          SET revoked_at = NOW()
          WHERE token_hash = $1 AND revoked_at IS NULL
        `,
        [this.hashToken(refreshToken)],
      );
    }

    return { message: 'Çıkış yapıldı.' };
  }

  async getProfile(userId: string): Promise<UserProfileRow> {
    const result = await this.dbService.query<UserProfileRow>(
      `
        SELECT
          id,
          email,
          name,
          surname,
          profile_image AS "profileImage",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM users
        WHERE id = $1
      `,
      [userId],
    );

    const user = result.rows[0];

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    return user;
  }

  async updateProfile(
    userId: string,
    body: UpdateProfileDto,
  ): Promise<UserProfileRow> {
    if (
      body.email === undefined &&
      body.name === undefined &&
      body.surname === undefined &&
      body.profileImage === undefined
    ) {
      throw new BadRequestException(
        'Güncellenecek en az bir alan gönderilmelidir.',
      );
    }

    const email = body.email?.trim().toLowerCase() ?? null;
    const name = body.name?.trim() ?? null;
    const surname = body.surname?.trim() ?? null;
    const profileImage = body.profileImage?.trim() ?? null;

    try {
      const result = await this.dbService.query<UserProfileRow>(
        `
          UPDATE users
          SET
            name = COALESCE($1, name),
            surname = COALESCE($2, surname),
            profile_image = COALESCE($3, profile_image),
            email = COALESCE($4, email),
            updated_at = NOW()
          WHERE id = $5
          RETURNING
            id,
            email,
            name,
            surname,
            profile_image AS "profileImage",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
        `,
        [name, surname, profileImage, email, userId],
      );

      const user = result.rows[0];

      if (!user) {
        throw new NotFoundException('Kullanıcı bulunamadı.');
      }

      return user;
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Bu e-posta zaten kayıtlı.');
      }

      throw error;
    }
  }

  async changePassword(
    userId: string,
    body: ChangePasswordDto,
  ): Promise<{ id: string }> {
    const passwordResult = await this.dbService.query<{
      passwordHash: string;
    }>(
      `
        SELECT password_hash AS "passwordHash"
        FROM users
        WHERE id = $1
      `,
      [userId],
    );

    const user = passwordResult.rows[0];

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    const passwordMatches = await bcrypt.compare(
      body.currentPassword,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new BadRequestException('Mevcut şifre hatalı.');
    }

    const samePassword = await bcrypt.compare(
      body.newPassword,
      user.passwordHash,
    );

    if (samePassword) {
      throw new BadRequestException(
        'Yeni şifre mevcut şifreden farklı olmalıdır.',
      );
    }

    const passwordHash = await bcrypt.hash(
      body.newPassword,
      PASSWORD_SALT_ROUNDS,
    );
    const client = await this.dbService.getClient();
    let transactionStarted = false;

    try {
      await client.query('BEGIN');
      transactionStarted = true;

      const result = await client.query<{ id: string }>(
        `
          UPDATE users
          SET password_hash = $1, updated_at = NOW()
          WHERE id = $2
          RETURNING id
        `,
        [passwordHash, userId],
      );
      await client.query(
        `
          UPDATE refresh_tokens
          SET revoked_at = NOW()
          WHERE user_id = $1 AND revoked_at IS NULL
        `,
        [userId],
      );

      await client.query('COMMIT');
      transactionStarted = false;

      return result.rows[0];
    } catch (error: unknown) {
      if (transactionStarted) {
        await client.query('ROLLBACK');
      }

      throw error;
    } finally {
      client.release();
    }
  }

  async forgotPassword(body: ForgotPasswordDto): Promise<{ message: string }> {
    const message = 'E-posta kayıtlıysa şifre sıfırlama bağlantısı gönderildi.';
    const email = body.email.trim().toLowerCase();
    const result = await this.dbService.query<PasswordResetUserRow>(
      `
        SELECT
          id,
          email,
          is_active AS "isActive"
        FROM users
        WHERE email = $1
    `,
      [email],
    );
    const user = result.rows[0];

    if (!user || !user.isActive) {
      return { message };
    }

    const resetToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        jti: randomUUID(),
        email: user.email,
        purpose: 'password-reset',
      },
      { expiresIn: '15m' },
    );

    await this.storePasswordResetToken(user.id, resetToken);
    await this.mailQueueService.enqueuePasswordReset(user.email, resetToken);

    return { message };
  }
  async resetPassword(body: ResetPasswordDto): Promise<{ message: string }> {
    let payload: PasswordResetPayload;

    try {
      payload = await this.jwtService.verifyAsync<PasswordResetPayload>(
        body.token,
      );
    } catch {
      throw new BadRequestException(
        'Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.',
      );
    }

    if (
      typeof payload.sub !== 'string' ||
      typeof payload.jti !== 'string' ||
      payload.purpose !== 'password-reset'
    ) {
      throw new BadRequestException('Geçersiz şifre sıfırlama tokenı.');
    }

    const client = await this.dbService.getClient();
    let transactionStarted = false;

    try {
      await client.query('BEGIN');
      transactionStarted = true;

      const result = await client.query<PasswordResetTokenRow>(
        `
          SELECT
            prt.id,
            prt.user_id AS "userId",
            u.password_hash AS "passwordHash",
            u.is_active AS "isActive"
          FROM password_reset_tokens prt
          INNER JOIN users u ON u.id = prt.user_id
          WHERE
            prt.token_hash = $1
            AND prt.user_id = $2
            AND prt.used_at IS NULL
            AND prt.expires_at > NOW()
          FOR UPDATE OF prt
        `,
        [this.hashToken(body.token), payload.sub],
      );
      const storedToken = result.rows[0];

      if (!storedToken || !storedToken.isActive) {
        throw new BadRequestException(
          'Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.',
        );
      }

      const samePassword = await bcrypt.compare(
        body.newPassword,
        storedToken.passwordHash,
      );

      if (samePassword) {
        throw new BadRequestException(
          'Yeni şifre mevcut şifreden farklı olmalıdır.',
        );
      }

      const passwordHash = await bcrypt.hash(
        body.newPassword,
        PASSWORD_SALT_ROUNDS,
      );

      await client.query(
        `
          UPDATE users
          SET password_hash = $1, updated_at = NOW()
          WHERE id = $2
        `,
        [passwordHash, storedToken.userId],
      );
      await client.query(
        `
          UPDATE password_reset_tokens
          SET used_at = NOW()
          WHERE id = $1
        `,
        [storedToken.id],
      );
      await client.query(
        `
          UPDATE refresh_tokens
          SET revoked_at = NOW()
          WHERE user_id = $1 AND revoked_at IS NULL
        `,
        [storedToken.userId],
      );

      await client.query('COMMIT');
      transactionStarted = false;

      return {
        message: 'Şifreniz başarıyla değiştirildi.',
      };
    } catch (error: unknown) {
      if (transactionStarted) {
        await client.query('ROLLBACK');
      }

      throw error;
    } finally {
      client.release();
    }
  }

  private async createSession(
    userId: string,
    email: string,
  ): Promise<TokenPair> {
    const accessToken = await this.createAccessToken(userId, email);
    const refreshToken = this.generateOpaqueToken();

    await this.dbService.query(
      `
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
      `,
      [
        userId,
        this.hashToken(refreshToken),
        new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      ],
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  private createAccessToken(userId: string, email: string): Promise<string> {
    return this.jwtService.signAsync({
      sub: userId,
      email,
      purpose: 'access',
    });
  }

  private async storePasswordResetToken(
    userId: string,
    resetToken: string,
  ): Promise<void> {
    const client = await this.dbService.getClient();
    let transactionStarted = false;

    try {
      await client.query('BEGIN');
      transactionStarted = true;

      await client.query(
        `
          UPDATE password_reset_tokens
          SET used_at = NOW()
          WHERE user_id = $1 AND used_at IS NULL
        `,
        [userId],
      );
      await client.query(
        `
          INSERT INTO password_reset_tokens
            (user_id, token_hash, expires_at)
          VALUES ($1, $2, $3)
        `,
        [
          userId,
          this.hashToken(resetToken),
          new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
        ],
      );

      await client.query('COMMIT');
      transactionStarted = false;
    } catch (error: unknown) {
      if (transactionStarted) {
        await client.query('ROLLBACK');
      }

      throw error;
    } finally {
      client.release();
    }
  }

  private generateOpaqueToken(): string {
    return randomBytes(48).toString('base64url');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    );
  }
}
