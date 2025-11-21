/**
 * NEXUS IDaaS - Authentication Controller
 */

import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { MFAService } from '../services/mfa.service';
import { LoginRequest, RegisterRequest, MFAEnrollmentRequest } from '../types';
import { logger } from '../utils/logger';

const authService = new AuthService();
const mfaService = new MFAService();

/**
 * Register new user
 * POST /api/v1/auth/register
 */
export async function register(req: Request, res: Response): Promise<void> {
  const data: RegisterRequest = req.body;
  const ipAddress = req.ip || req.socket.remoteAddress || '0.0.0.0';

  const result = await authService.register(data, undefined, ipAddress);

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        emailVerified: result.user.emailVerified,
      },
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
}

/**
 * Login user
 * POST /api/v1/auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  const credentials: LoginRequest = req.body;
  const ipAddress = req.ip || req.socket.remoteAddress || '0.0.0.0';
  const userAgent = req.headers['user-agent'] || '';

  const result = await authService.login(credentials, ipAddress, userAgent);

  res.json({
    success: true,
    data: result,
  });
}

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
export async function logout(req: Request, res: Response): Promise<void> {
  const token = req.headers.authorization?.substring(7);
  const ipAddress = req.ip || req.socket.remoteAddress || '0.0.0.0';

  if (token) {
    await authService.logout(token, ipAddress);
  }

  res.json({
    success: true,
    data: { message: 'Logged out successfully' },
  });
}

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;

  const result = await authService.refreshAccessToken(refreshToken);

  res.json({
    success: true,
    data: result,
  });
}

/**
 * Verify email
 * POST /api/v1/auth/verify-email
 */
export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const { token } = req.body;

  await authService.verifyEmail(token);

  res.json({
    success: true,
    data: { message: 'Email verified successfully' },
  });
}

/**
 * Request password reset
 * POST /api/v1/auth/forgot-password
 */
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body;
  const ipAddress = req.ip || req.socket.remoteAddress || '0.0.0.0';

  await authService.requestPasswordReset(email, ipAddress);

  res.json({
    success: true,
    data: { message: 'Password reset email sent' },
  });
}

/**
 * Reset password
 * POST /api/v1/auth/reset-password
 */
export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, newPassword } = req.body;

  await authService.resetPassword(token, newPassword);

  res.json({
    success: true,
    data: { message: 'Password reset successfully' },
  });
}

/**
 * Change password (authenticated)
 * POST /api/v1/auth/change-password
 */
export async function changePassword(req: Request, res: Response): Promise<void> {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user!.userId;

  await authService.changePassword(userId, currentPassword, newPassword);

  res.json({
    success: true,
    data: { message: 'Password changed successfully' },
  });
}

/**
 * Get current user profile
 * GET /api/v1/auth/me
 */
export async function getProfile(req: Request, res: Response): Promise<void> {
  // User is already attached to request by auth middleware
  res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
}

/**
 * Enroll in MFA
 * POST /api/v1/auth/mfa/enroll
 */
export async function enrollMFA(req: Request, res: Response): Promise<void> {
  const data: MFAEnrollmentRequest = req.body;
  const userId = req.user!.userId;

  const result = await mfaService.enroll(userId, data);

  res.json({
    success: true,
    data: result,
  });
}

/**
 * Verify MFA enrollment
 * POST /api/v1/auth/mfa/verify-enrollment
 */
export async function verifyMFAEnrollment(req: Request, res: Response): Promise<void> {
  const { code } = req.body;
  const userId = req.user!.userId;

  const result = await mfaService.verifyEnrollment(userId, code);

  res.json({
    success: true,
    data: {
      verified: result,
      message: result ? 'MFA enabled successfully' : 'Invalid code',
    },
  });
}

/**
 * Disable MFA
 * POST /api/v1/auth/mfa/disable
 */
export async function disableMFA(req: Request, res: Response): Promise<void> {
  const { code } = req.body;
  const userId = req.user!.userId;

  await mfaService.disable(userId, code);

  res.json({
    success: true,
    data: { message: 'MFA disabled successfully' },
  });
}

/**
 * Send SMS MFA code
 * POST /api/v1/auth/mfa/sms/send
 */
export async function sendSMSCode(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;

  await mfaService.sendSMSCode(userId);

  res.json({
    success: true,
    data: { message: 'SMS code sent' },
  });
}

/**
 * Get backup codes
 * GET /api/v1/auth/mfa/backup-codes
 */
export async function getBackupCodes(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;

  const codes = await mfaService.getBackupCodes(userId);

  res.json({
    success: true,
    data: { codes },
  });
}

/**
 * Regenerate backup codes
 * POST /api/v1/auth/mfa/backup-codes/regenerate
 */
export async function regenerateBackupCodes(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;

  const codes = await mfaService.regenerateBackupCodes(userId);

  res.json({
    success: true,
    data: { codes },
  });
}
