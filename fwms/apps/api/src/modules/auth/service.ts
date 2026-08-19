import prisma from '../../lib/prisma.js';
import bcrypt from 'bcrypt';
import { signAccessToken, signRefreshToken, JwtPayload } from '../../lib/jwt.js';
import { ApiError } from '../../middleware/error-handler.js';
import logger from '../../lib/logger.js';

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

class AuthService {
  /**
   * Authenticate user and return tokens + user info.
   */
  async login(email: string, password: string, ipAddress?: string) {
    const user = await prisma.userAuth.findUnique({
      where: { username: email },
      include: { linkedFaculty: true },
    });

    // Generic error to avoid email enumeration
    if (!user) {
      await this.logAudit(null, 'login_failed', ipAddress, { email, reason: 'user_not_found' });
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Check account status
    if (user.status === 'inactive') {
      await this.logAudit(user.id, 'login_failed', ipAddress, { reason: 'account_inactive' });
      throw ApiError.unauthorized('Account is deactivated. Contact your administrator.');
    }

    // Check lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMs = user.lockedUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      await this.logAudit(user.id, 'login_failed', ipAddress, { reason: 'account_locked' });
      throw ApiError.unauthorized(`Account is locked. Try again in ${remainingMin} minute(s).`);
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      const attempts = user.failedLoginAttempts + 1;
      const updateData: any = { failedLoginAttempts: attempts };

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        logger.warn({ userId: user.id, email }, 'Account locked after failed attempts');
      }

      await prisma.userAuth.update({ where: { id: user.id }, data: updateData });
      await this.logAudit(user.id, 'login_failed', ipAddress, { reason: 'invalid_password', attempt: attempts });

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        throw ApiError.unauthorized('Account locked for 15 minutes due to too many failed attempts.');
      }

      throw ApiError.unauthorized('Invalid email or password');
    }

    // Successful login — reset failed attempts
    await prisma.userAuth.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // Build JWT payload
    const deptId = user.linkedFaculty?.deptId ?? null;
    const payload: JwtPayload = {
      userId: user.id,
      role: user.role as JwtPayload['role'],
      deptId,
      facultyId: user.linkedId,
      tokenVersion: user.tokenVersion,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await this.logAudit(user.id, 'login_success', ipAddress);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.username,
        role: user.role,
        name: user.linkedFaculty?.name ?? 'Super Admin',
        deptId,
        facultyId: user.linkedId,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  /**
   * Logout: bump token version to invalidate all existing refresh tokens.
   */
  async logout(userId: number, ipAddress?: string) {
    await prisma.userAuth.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
    await this.logAudit(userId, 'logout', ipAddress);
  }

  /**
   * Refresh: issue new access token from a valid refresh token payload.
   * Verifies tokenVersion matches to detect revoked tokens.
   */
  async refresh(payload: JwtPayload) {
    const user = await prisma.userAuth.findUnique({ where: { id: payload.userId } });

    if (!user || user.status === 'inactive') {
      throw ApiError.unauthorized('User not found or inactive');
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw ApiError.unauthorized('Refresh token has been revoked');
    }

    const newPayload: JwtPayload = {
      userId: user.id,
      role: user.role as JwtPayload['role'],
      deptId: payload.deptId,
      facultyId: user.linkedId,
      tokenVersion: user.tokenVersion,
    };

    return { accessToken: signAccessToken(newPayload) };
  }

  /**
   * Change user password and clear mustChangePassword flag.
   */
  async changePassword(userId: number, newPassword: string, ipAddress?: string) {
    const passwordHash = await this.hashPassword(newPassword);
    await prisma.userAuth.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
        tokenVersion: { increment: 1 }, // Invalidates old sessions
      },
    });
    await this.logAudit(userId, 'password_changed', ipAddress);
  }

  /**
   * Hash a password with bcrypt.
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  /**
   * Log to the AuditLog table.
   */
  private async logAudit(userId: number | null, action: string, ipAddress?: string, metadata?: any) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          ipAddress: ipAddress || null,
          metadata: metadata || null,
        },
      });
    } catch (err) {
      logger.error({ err, userId, action }, 'Failed to write audit log');
    }
  }
}

export const authService = new AuthService();
