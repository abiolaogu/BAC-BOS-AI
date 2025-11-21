/**
 * NEXUS IDaaS - Multi-Factor Authentication Service
 * TOTP, SMS, Email, Backup codes
 */

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import {
  MFAMethod,
  MFAEnrollmentRequest,
  MFAEnrollmentResponse,
  IDaaSError,
  ErrorCode,
} from '../types';
import { db } from '../database';
import { cache } from '../utils/cache';
import { logger } from '../utils/logger';
import { generateBackupCodes, hashPassword } from '../utils/crypto';
import { config } from '../config';

export class MFAService {
  /**
   * Enroll user in MFA
   */
  async enroll(
    userId: string,
    request: MFAEnrollmentRequest
  ): Promise<MFAEnrollmentResponse> {
    const user = await db.queryOne(
      'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );

    if (!user) {
      throw new IDaaSError(
        ErrorCode.USER_NOT_FOUND,
        'User not found',
        404
      );
    }

    if (user.mfa_enabled) {
      throw new IDaaSError(
        ErrorCode.INVALID_REQUEST,
        'MFA is already enabled for this user',
        400
      );
    }

    switch (request.method) {
      case MFAMethod.TOTP:
        return await this.enrollTOTP(userId, user.email);

      case MFAMethod.SMS:
        return await this.enrollSMS(userId, request.phoneNumber!);

      case MFAMethod.EMAIL:
        return await this.enrollEmail(userId, request.email || user.email);

      default:
        throw new IDaaSError(
          ErrorCode.INVALID_REQUEST,
          'Unsupported MFA method',
          400
        );
    }
  }

  /**
   * Enroll in TOTP (Time-based One-Time Password)
   */
  private async enrollTOTP(
    userId: string,
    email: string
  ): Promise<MFAEnrollmentResponse> {
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${config.mfa.issuer} (${email})`,
      issuer: config.mfa.issuer,
      length: 32,
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    // Generate backup codes
    const backupCodes = generateBackupCodes(config.mfa.backupCodesCount);
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => hashPassword(code))
    );

    // Store secret temporarily (not enabled yet, will be enabled after verification)
    await cache.set(`mfa:enroll:${userId}`, {
      secret: secret.base32,
      backupCodes: hashedBackupCodes,
      method: MFAMethod.TOTP,
    }, 600); // 10 minutes to complete enrollment

    return {
      secret: secret.base32,
      qrCode,
      backupCodes,
    };
  }

  /**
   * Enroll in SMS MFA
   */
  private async enrollSMS(
    userId: string,
    phoneNumber: string
  ): Promise<MFAEnrollmentResponse> {
    // Validate phone number format
    if (!this.isValidPhoneNumber(phoneNumber)) {
      throw new IDaaSError(
        ErrorCode.INVALID_REQUEST,
        'Invalid phone number format',
        400
      );
    }

    // Store phone number temporarily
    await cache.set(`mfa:enroll:${userId}`, {
      phoneNumber,
      method: MFAMethod.SMS,
    }, 600);

    // Generate and send verification code
    const code = this.generateSMSCode();
    await cache.set(`mfa:sms:${userId}`, code, 300); // 5 minutes

    // TODO: Send SMS via VAS service
    logger.info('SMS MFA code generated', { userId, phoneNumber, code });

    return {
      backupCodes: generateBackupCodes(config.mfa.backupCodesCount),
    };
  }

  /**
   * Enroll in Email MFA
   */
  private async enrollEmail(
    userId: string,
    email: string
  ): Promise<MFAEnrollmentResponse> {
    // Store email temporarily
    await cache.set(`mfa:enroll:${userId}`, {
      email,
      method: MFAMethod.EMAIL,
    }, 600);

    // Generate and send verification code
    const code = this.generateEmailCode();
    await cache.set(`mfa:email:${userId}`, code, 300); // 5 minutes

    // TODO: Send email via Email service
    logger.info('Email MFA code generated', { userId, email, code });

    return {
      backupCodes: generateBackupCodes(config.mfa.backupCodesCount),
    };
  }

  /**
   * Verify MFA enrollment
   */
  async verifyEnrollment(userId: string, code: string): Promise<boolean> {
    const enrollmentData = await cache.get<any>(`mfa:enroll:${userId}`);

    if (!enrollmentData) {
      throw new IDaaSError(
        ErrorCode.INVALID_REQUEST,
        'No MFA enrollment in progress',
        400
      );
    }

    let isValid = false;

    switch (enrollmentData.method) {
      case MFAMethod.TOTP:
        isValid = speakeasy.totp.verify({
          secret: enrollmentData.secret,
          encoding: 'base32',
          token: code,
          window: config.mfa.window,
        });
        break;

      case MFAMethod.SMS:
        const smsCode = await cache.get<string>(`mfa:sms:${userId}`);
        isValid = smsCode === code;
        break;

      case MFAMethod.EMAIL:
        const emailCode = await cache.get<string>(`mfa:email:${userId}`);
        isValid = emailCode === code;
        break;
    }

    if (!isValid) {
      return false;
    }

    // Enable MFA
    await db.query(
      `UPDATE users
       SET mfa_enabled = true,
           mfa_method = $1,
           mfa_secret = $2,
           backup_codes = $3
       WHERE id = $4`,
      [
        enrollmentData.method,
        enrollmentData.secret || null,
        enrollmentData.backupCodes || [],
        userId,
      ]
    );

    // Clear enrollment cache
    await cache.delete(`mfa:enroll:${userId}`);
    await cache.delete(`mfa:sms:${userId}`);
    await cache.delete(`mfa:email:${userId}`);

    logger.info('MFA enabled', { userId, method: enrollmentData.method });

    return true;
  }

  /**
   * Verify MFA code during login
   */
  async verifyCode(userId: string, code: string): Promise<boolean> {
    const user = await db.queryOne(
      'SELECT * FROM users WHERE id = $1 AND mfa_enabled = true',
      [userId]
    );

    if (!user) {
      return false;
    }

    // Try backup code first
    if (await this.verifyBackupCode(userId, code, user.backup_codes || [])) {
      return true;
    }

    // Verify based on method
    switch (user.mfa_method) {
      case MFAMethod.TOTP:
        return this.verifyTOTPCode(user.mfa_secret, code);

      case MFAMethod.SMS:
        return await this.verifySMSCode(userId, code);

      case MFAMethod.EMAIL:
        return await this.verifyEmailCode(userId, code);

      default:
        return false;
    }
  }

  /**
   * Verify TOTP code
   */
  private verifyTOTPCode(secret: string, code: string): boolean {
    if (!secret) {
      return false;
    }

    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: config.mfa.window,
    });
  }

  /**
   * Verify SMS code
   */
  private async verifySMSCode(userId: string, code: string): Promise<boolean> {
    const cachedCode = await cache.get<string>(`mfa:sms:${userId}`);
    return cachedCode === code;
  }

  /**
   * Verify Email code
   */
  private async verifyEmailCode(userId: string, code: string): Promise<boolean> {
    const cachedCode = await cache.get<string>(`mfa:email:${userId}`);
    return cachedCode === code;
  }

  /**
   * Verify backup code
   */
  private async verifyBackupCode(
    userId: string,
    code: string,
    hashedCodes: string[]
  ): Promise<boolean> {
    for (let i = 0; i < hashedCodes.length; i++) {
      const bcrypt = require('bcrypt');
      const isValid = await bcrypt.compare(code, hashedCodes[i]);

      if (isValid) {
        // Remove used backup code
        hashedCodes.splice(i, 1);
        await db.query(
          'UPDATE users SET backup_codes = $1 WHERE id = $2',
          [hashedCodes, userId]
        );

        logger.info('Backup code used', { userId, remainingCodes: hashedCodes.length });
        return true;
      }
    }

    return false;
  }

  /**
   * Disable MFA
   */
  async disable(userId: string, verificationCode: string): Promise<void> {
    const user = await db.queryOne(
      'SELECT * FROM users WHERE id = $1 AND mfa_enabled = true',
      [userId]
    );

    if (!user) {
      throw new IDaaSError(
        ErrorCode.USER_NOT_FOUND,
        'User not found or MFA not enabled',
        404
      );
    }

    // Verify code before disabling
    const isValid = await this.verifyCode(userId, verificationCode);
    if (!isValid) {
      throw new IDaaSError(
        ErrorCode.INVALID_MFA_CODE,
        'Invalid verification code',
        401
      );
    }

    // Disable MFA
    await db.query(
      `UPDATE users
       SET mfa_enabled = false,
           mfa_method = NULL,
           mfa_secret = NULL,
           backup_codes = NULL
       WHERE id = $1`,
      [userId]
    );

    logger.info('MFA disabled', { userId });
  }

  /**
   * Send SMS code
   */
  async sendSMSCode(userId: string): Promise<void> {
    const user = await db.queryOne(
      'SELECT * FROM users WHERE id = $1 AND mfa_method = $2',
      [userId, MFAMethod.SMS]
    );

    if (!user || !user.phone_number) {
      throw new IDaaSError(
        ErrorCode.INVALID_REQUEST,
        'SMS MFA not configured for this user',
        400
      );
    }

    const code = this.generateSMSCode();
    await cache.set(`mfa:sms:${userId}`, code, 300); // 5 minutes

    // TODO: Send SMS via VAS service
    logger.info('SMS MFA code sent', { userId, phoneNumber: user.phone_number, code });
  }

  /**
   * Send Email code
   */
  async sendEmailCode(userId: string): Promise<void> {
    const user = await db.queryOne(
      'SELECT * FROM users WHERE id = $1 AND mfa_method = $2',
      [userId, MFAMethod.EMAIL]
    );

    if (!user) {
      throw new IDaaSError(
        ErrorCode.INVALID_REQUEST,
        'Email MFA not configured for this user',
        400
      );
    }

    const code = this.generateEmailCode();
    await cache.set(`mfa:email:${userId}`, code, 300); // 5 minutes

    // TODO: Send email via Email service
    logger.info('Email MFA code sent', { userId, email: user.email, code });
  }

  /**
   * Get backup codes
   */
  async getBackupCodes(userId: string): Promise<string[]> {
    const user = await db.queryOne(
      'SELECT backup_codes FROM users WHERE id = $1 AND mfa_enabled = true',
      [userId]
    );

    if (!user || !user.backup_codes) {
      return [];
    }

    // Don't return actual codes, just count
    return user.backup_codes.map((_: any, i: number) => `Backup code ${i + 1}`);
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const user = await db.queryOne(
      'SELECT * FROM users WHERE id = $1 AND mfa_enabled = true',
      [userId]
    );

    if (!user) {
      throw new IDaaSError(
        ErrorCode.USER_NOT_FOUND,
        'User not found or MFA not enabled',
        404
      );
    }

    const backupCodes = generateBackupCodes(config.mfa.backupCodesCount);
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => hashPassword(code))
    );

    await db.query(
      'UPDATE users SET backup_codes = $1 WHERE id = $2',
      [hashedBackupCodes, userId]
    );

    logger.info('Backup codes regenerated', { userId });

    return backupCodes;
  }

  /**
   * Generate SMS code
   */
  private generateSMSCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate Email code
   */
  private generateEmailCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Validate phone number format
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic E.164 format validation
    return /^\+[1-9]\d{1,14}$/.test(phoneNumber);
  }
}
