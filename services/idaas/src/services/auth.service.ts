/**
 * NEXUS IDaaS - Authentication Service
 * Core authentication logic including login, registration, password management
 */

import { v4 as uuidv4 } from 'uuid';
import {
  User,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UserStatus,
  IDaaSError,
  ErrorCode,
  DeviceInfo,
  TokenType,
} from '../types';
import { db } from '../database';
import { cache } from '../utils/cache';
import { logger } from '../utils/logger';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  validatePassword,
} from '../utils/crypto';
import {
  generateTokenPair,
  generateEmailVerificationToken,
  generatePasswordResetToken,
  verifyToken,
  generateMFAToken,
} from '../utils/jwt';
import { config } from '../config';
import { AuditService } from './audit.service';
import { EmailService } from './email.service';

export class AuthService {
  private auditService: AuditService;
  private mfaService: MFAService;
  private emailService: EmailService;

  constructor() {
    this.auditService = new AuditService();
    this.mfaService = new MFAService();
    this.emailService = new EmailService();
  }

  /**
   * Register a new user
   */
  async register(
    data: RegisterRequest,
    deviceInfo?: DeviceInfo,
    ipAddress: string = '0.0.0.0'
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    // Validate password
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.valid) {
      throw new IDaaSError(
        ErrorCode.WEAK_PASSWORD,
        passwordValidation.errors.join(', '),
        400,
        { errors: passwordValidation.errors }
      );
    }

    // Check if user already exists
    const existingUser = await db.queryOne<User>(
      'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
      [data.email.toLowerCase()]
    );

    if (existingUser) {
      throw new IDaaSError(
        ErrorCode.USER_ALREADY_EXISTS,
        'User with this email already exists',
        409
      );
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user
    const user = await db.queryOne<User>(
      `INSERT INTO users (
        email, password_hash, first_name, last_name, status, password_changed_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *`,
      [
        data.email.toLowerCase(),
        passwordHash,
        data.firstName || null,
        data.lastName || null,
        UserStatus.PENDING, // Email verification required
      ]
    );

    if (!user) {
      throw new IDaaSError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to create user',
        500
      );
    }

    // Create organization if organizationName provided
    if (data.organizationName) {
      const slug = data.organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const org = await db.queryOne(
        `INSERT INTO organizations (name, slug)
         VALUES ($1, $2)
         RETURNING *`,
        [data.organizationName, slug]
      );

      if (org) {
        // Add user to organization as admin
        await db.query(
          `INSERT INTO organization_memberships (user_id, organization_id, role)
           VALUES ($1, $2, $3)`,
          [user.id, org.id, 'admin']
        );
      }
    }

    // Generate email verification token
    const verificationToken = generateToken();
    await db.query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
      [user.id, verificationToken]
    );

    // Send verification email
    if (config.email.enabled) {
      try {
        await this.emailService.sendVerificationEmail(user.email, verificationToken);
      } catch (error) {
        logger.error('Failed to send verification email', { error, userId: user.id });
        // Don't fail registration if email fails, but log it
      }
    } else {
      logger.info('Email disabled, skipping verification email', {
        userId: user.id,
        verificationToken,
      });
    }

    // Generate tokens
    const { accessToken, refreshToken, expiresIn } = generateTokenPair({
      userId: user.id,
      email: user.email,
    });

    // Create session
    await this.createSession(user.id, accessToken, refreshToken, deviceInfo || {}, ipAddress);

    // Audit log
    await this.auditService.log({
      userId: user.id,
      action: 'user_created',
      resource: 'users',
      resourceId: user.id,
      ipAddress,
      status: 'success',
    });

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Login user
   */
  async login(
    credentials: LoginRequest,
    ipAddress: string = '0.0.0.0',
    userAgent: string = ''
  ): Promise<LoginResponse> {
    // Get user
    const user = await db.queryOne<User>(
      'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
      [credentials.email.toLowerCase()]
    );

    if (!user) {
      // Log failed attempt
      await this.auditService.log({
        action: 'login_failed',
        resource: 'auth',
        ipAddress,
        status: 'failure',
        details: { reason: 'user_not_found', email: credentials.email },
      });

      throw new IDaaSError(
        ErrorCode.INVALID_CREDENTIALS,
        'Invalid email or password',
        401
      );
    }

    // Check account status
    if (user.status === UserStatus.SUSPENDED) {
      throw new IDaaSError(
        ErrorCode.ACCOUNT_SUSPENDED,
        'Your account has been suspended',
        403
      );
    }

    if (user.status === UserStatus.LOCKED) {
      throw new IDaaSError(
        ErrorCode.ACCOUNT_LOCKED,
        'Your account has been locked due to too many failed login attempts',
        403
      );
    }

    // Check if account is locked temporarily
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const minutesLeft = Math.ceil(
        (new Date(user.lockedUntil).getTime() - Date.now()) / 60000
      );
      throw new IDaaSError(
        ErrorCode.ACCOUNT_LOCKED,
        `Account is temporarily locked. Try again in ${minutesLeft} minutes`,
        403
      );
    }

    // Verify password
    if (!user.passwordHash) {
      throw new IDaaSError(
        ErrorCode.INVALID_CREDENTIALS,
        'Password not set. Please use SSO or reset your password',
        401
      );
    }

    const isPasswordValid = await verifyPassword(
      credentials.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      // Increment failed login attempts
      const failedAttempts = user.failedLoginAttempts + 1;
      const updateFields: any = {
        failed_login_attempts: failedAttempts,
      };

      // Lock account if too many attempts
      if (failedAttempts >= config.security.maxLoginAttempts) {
        updateFields.locked_until = new Date(
          Date.now() + config.security.lockoutDuration * 60 * 1000
        );
      }

      await db.query(
        `UPDATE users
         SET failed_login_attempts = $1, locked_until = $2
         WHERE id = $3`,
        [failedAttempts, updateFields.locked_until || null, user.id]
      );

      // Log failed attempt
      await this.auditService.log({
        userId: user.id,
        action: 'login_failed',
        resource: 'auth',
        ipAddress,
        status: 'failure',
        details: { reason: 'invalid_password', attempts: failedAttempts },
      });

      throw new IDaaSError(
        ErrorCode.INVALID_CREDENTIALS,
        'Invalid email or password',
        401
      );
    }

    // Check if MFA is enabled
    if (user.mfaEnabled) {
      if (!credentials.mfaCode) {
        // Generate MFA token for the verification flow
        const mfaToken = generateMFAToken({
          userId: user.id,
          email: user.email,
        });

        return {
          accessToken: '',
          refreshToken: '',
          expiresIn: 0,
          user: this.getUserProfile(user),
          requiresMfa: true,
          mfaToken,
        };
      }

      // Verify MFA code
      const mfaValid = await this.mfaService.verifyCode(user.id, credentials.mfaCode);
      if (!mfaValid) {
        await this.auditService.log({
          userId: user.id,
          action: 'login_failed',
          resource: 'auth',
          ipAddress,
          status: 'failure',
          details: { reason: 'invalid_mfa_code' },
        });

        throw new IDaaSError(
          ErrorCode.INVALID_MFA_CODE,
          'Invalid MFA code',
          401
        );
      }
    }

    // Reset failed login attempts
    await db.query(
      `UPDATE users
       SET failed_login_attempts = 0,
           locked_until = NULL,
           last_login_at = NOW(),
           last_login_ip = $1
       WHERE id = $2`,
      [ipAddress, user.id]
    );

    // Get user organizations
    const organizations = await db.queryMany(
      `SELECT o.id, o.name, o.slug, om.role
       FROM organizations o
       JOIN organization_memberships om ON o.id = om.organization_id
       WHERE om.user_id = $1 AND o.deleted_at IS NULL`,
      [user.id]
    );

    // Generate tokens
    const { accessToken, refreshToken, expiresIn } = generateTokenPair({
      userId: user.id,
      email: user.email,
      organizationId: organizations[0]?.id,
      roles: organizations.map((o: any) => o.role),
    });

    // Create session
    await this.createSession(
      user.id,
      accessToken,
      refreshToken,
      credentials.deviceInfo || {},
      ipAddress,
      userAgent
    );

    // Audit log
    await this.auditService.log({
      userId: user.id,
      action: 'login',
      resource: 'auth',
      ipAddress,
      status: 'success',
    });

    // Update user object with organizations
    const userProfile = this.getUserProfile(user, organizations);

    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: userProfile,
      requiresMfa: false,
    };
  }

  /**
   * Logout user
   */
  async logout(accessToken: string, ipAddress: string = '0.0.0.0'): Promise<void> {
    const payload = verifyToken(accessToken);

    // Delete session
    await db.query(
      'DELETE FROM sessions WHERE user_id = $1 AND access_token_hash = $2',
      [payload.userId, this.hashToken(accessToken)]
    );

    // Clear cache
    await cache.delete(`session:${payload.userId}`);

    // Audit log
    await this.auditService.log({
      userId: payload.userId,
      action: 'logout',
      resource: 'auth',
      ipAddress,
      status: 'success',
    });
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const payload = verifyToken(refreshToken);

    if (payload.type !== TokenType.REFRESH) {
      throw new IDaaSError(
        ErrorCode.INVALID_TOKEN,
        'Invalid refresh token',
        401
      );
    }

    // Check if session exists
    const session = await db.queryOne(
      'SELECT * FROM sessions WHERE user_id = $1 AND refresh_token_hash = $2',
      [payload.userId, this.hashToken(refreshToken)]
    );

    if (!session) {
      throw new IDaaSError(
        ErrorCode.INVALID_TOKEN,
        'Session not found',
        401
      );
    }

    // Generate new tokens
    const tokens = generateTokenPair({
      userId: payload.userId,
      email: payload.email,
      organizationId: payload.organizationId,
      roles: payload.roles,
    });

    // Update session
    await db.query(
      `UPDATE sessions
       SET access_token_hash = $1,
           refresh_token_hash = $2,
           expires_at = NOW() + INTERVAL '${config.jwt.refreshTokenExpiry}',
           last_activity_at = NOW()
       WHERE id = $3`,
      [
        this.hashToken(tokens.accessToken),
        this.hashToken(tokens.refreshToken),
        session.id,
      ]
    );

    return tokens;
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<void> {
    const record = await db.queryOne(
      `SELECT * FROM email_verification_tokens
       WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [token]
    );

    if (!record) {
      throw new IDaaSError(
        ErrorCode.INVALID_TOKEN,
        'Invalid or expired verification token',
        400
      );
    }

    // Update user
    await db.query(
      `UPDATE users
       SET email_verified = true, status = $1
       WHERE id = $2`,
      [UserStatus.ACTIVE, record.user_id]
    );

    // Mark token as used
    await db.query(
      'UPDATE email_verification_tokens SET used_at = NOW() WHERE id = $1',
      [record.id]
    );

    logger.info('Email verified', { userId: record.user_id });
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string, ipAddress: string = '0.0.0.0'): Promise<void> {
    const user = await db.queryOne<User>(
      'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email.toLowerCase()]
    );

    if (!user) {
      // Don't reveal if user exists
      logger.warn('Password reset requested for non-existent user', { email });
      return;
    }

    // Generate reset token
    const resetToken = generateToken();
    await db.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
      [user.id, resetToken]
    );

    // Send password reset email
    if (config.email.enabled) {
      try {
        await this.emailService.sendPasswordResetEmail(user.email, resetToken);
      } catch (error) {
        logger.error('Failed to send password reset email', { error, userId: user.id });
      }
    } else {
      logger.info('Email disabled, skipping password reset email', {
        userId: user.id,
        resetToken,
      });
    }

    // Audit log
    await this.auditService.log({
      userId: user.id,
      action: 'password_reset',
      resource: 'auth',
      ipAddress,
      status: 'success',
    });
  }

  /**
   * Reset password
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = await db.queryOne(
      `SELECT * FROM password_reset_tokens
       WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [token]
    );

    if (!record) {
      throw new IDaaSError(
        ErrorCode.INVALID_TOKEN,
        'Invalid or expired reset token',
        400
      );
    }

    // Validate password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new IDaaSError(
        ErrorCode.WEAK_PASSWORD,
        passwordValidation.errors.join(', '),
        400
      );
    }

    // Hash password
    const passwordHash = await hashPassword(newPassword);

    // Update user
    await db.query(
      `UPDATE users
       SET password_hash = $1, password_changed_at = NOW(), failed_login_attempts = 0, locked_until = NULL
       WHERE id = $2`,
      [passwordHash, record.user_id]
    );

    // Mark token as used
    await db.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
      [record.id]
    );

    // Invalidate all sessions
    await db.query('DELETE FROM sessions WHERE user_id = $1', [record.user_id]);

    logger.info('Password reset successful', { userId: record.user_id });
  }

  /**
   * Change password (authenticated)
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await db.queryOne<User>(
      'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );

    if (!user || !user.passwordHash) {
      throw new IDaaSError(
        ErrorCode.USER_NOT_FOUND,
        'User not found',
        404
      );
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new IDaaSError(
        ErrorCode.INVALID_CREDENTIALS,
        'Current password is incorrect',
        401
      );
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new IDaaSError(
        ErrorCode.WEAK_PASSWORD,
        passwordValidation.errors.join(', '),
        400
      );
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await db.query(
      `UPDATE users
       SET password_hash = $1, password_changed_at = NOW()
       WHERE id = $2`,
      [passwordHash, userId]
    );

    logger.info('Password changed', { userId });

    // Audit log
    await this.auditService.log({
      userId,
      action: 'password_changed',
      resource: 'auth',
      status: 'success',
    });
  }

  /**
   * Create session
   */
  private async createSession(
    userId: string,
    accessToken: string,
    refreshToken: string,
    deviceInfo: DeviceInfo,
    ipAddress: string,
    userAgent: string = ''
  ): Promise<void> {
    await db.query(
      `INSERT INTO sessions (
        user_id, access_token_hash, refresh_token_hash,
        device_info, ip_address, user_agent,
        expires_at, last_activity_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '${config.jwt.refreshTokenExpiry}', NOW())`,
      [
        userId,
        this.hashToken(accessToken),
        this.hashToken(refreshToken),
        JSON.stringify(deviceInfo),
        ipAddress,
        userAgent,
      ]
    );
  }

  /**
   * Hash token for storage
   */
  private hashToken(token: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Get user profile
   */
  private getUserProfile(user: User, organizations?: any[]): any {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
      organizations: organizations || [],
    };
  }
}
