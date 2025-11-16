import bcrypt from 'bcrypt';
import { UserModel, CreateUserData, User } from '../models/user';
import { SessionModel } from '../models/session';
import { TokenService } from './token.service';
import { EmailService } from './email.service';
import { logger } from '../middleware/logger';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

export interface LoginResult {
  user: Omit<User, 'password_hash' | 'mfa_secret'>;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  constructor(
    private userModel: UserModel,
    private sessionModel: SessionModel,
    private tokenService: TokenService,
    private emailService: EmailService
  ) {}

  async register(data: CreateUserData & { password: string }): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userModel.findByEmail(data.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    // Create user
    const user = await this.userModel.create({
      ...data,
      password: passwordHash,
    });

    // Send verification email
    await this.emailService.sendVerificationEmail(user.email, user.id);

    logger.info('User registered', { userId: user.id, email: user.email });

    return user;
  }

  async login(
    email: string,
    password: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<LoginResult> {
    // Find user
    const user = await this.userModel.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    if (!user.password_hash) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Check if MFA is enabled
    if (user.mfa_enabled) {
      // Return a special response indicating MFA is required
      // The actual MFA verification will be done in a separate endpoint
      throw new Error('MFA_REQUIRED');
    }

    // Update last login
    await this.userModel.updateLastLogin(user.id);

    // Generate tokens
    const accessToken = this.tokenService.generateAccessToken(user);
    const refreshToken = this.tokenService.generateRefreshToken();

    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    await this.sessionModel.create(user.id, refreshToken, expiresAt, deviceInfo, ipAddress);

    logger.info('User logged in', { userId: user.id, email: user.email });

    // Remove sensitive fields
    const { password_hash, mfa_secret, ...userWithoutSensitive } = user;

    return {
      user: userWithoutSensitive,
      accessToken,
      refreshToken,
    };
  }

  async loginWithOAuth(
    provider: 'google' | 'microsoft',
    oauthId: string,
    email: string,
    firstName: string,
    lastName: string
  ): Promise<LoginResult> {
    // Find or create user
    let user = await this.userModel.findByOAuth(provider, oauthId);

    if (!user) {
      // Check if user exists with this email
      user = await this.userModel.findByEmail(email);

      if (user) {
        // User exists but hasn't linked OAuth - this is a security concern
        throw new Error('Email already registered. Please login with password.');
      }

      // Create new user
      user = await this.userModel.create({
        email,
        first_name: firstName,
        last_name: lastName,
        oauth_provider: provider,
        oauth_id: oauthId,
      });

      // OAuth users are automatically verified
      await this.userModel.verifyEmail(user.id);

      logger.info('User registered via OAuth', { userId: user.id, provider });
    }

    // Update last login
    await this.userModel.updateLastLogin(user.id);

    // Generate tokens
    const accessToken = this.tokenService.generateAccessToken(user);
    const refreshToken = this.tokenService.generateRefreshToken();

    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.sessionModel.create(user.id, refreshToken, expiresAt);

    logger.info('User logged in via OAuth', { userId: user.id, provider });

    const { password_hash, mfa_secret, ...userWithoutSensitive } = user;

    return {
      user: userWithoutSensitive,
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Find session
    const session = await this.sessionModel.findByRefreshToken(refreshToken);
    if (!session) {
      throw new Error('Invalid refresh token');
    }

    // Get user
    const user = await this.userModel.findById(session.user_id);
    if (!user || !user.is_active) {
      throw new Error('Invalid user');
    }

    // Generate new tokens
    const newAccessToken = this.tokenService.generateAccessToken(user);
    const newRefreshToken = this.tokenService.generateRefreshToken();

    // Delete old session and create new one
    await this.sessionModel.delete(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.sessionModel.create(user.id, newRefreshToken, expiresAt);

    logger.info('Token refreshed', { userId: user.id });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.sessionModel.delete(refreshToken);
    logger.info('User logged out');
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessionModel.deleteAllForUser(userId);
    logger.info('User logged out from all devices', { userId });
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userModel.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return;
    }

    const resetToken = this.tokenService.generatePasswordResetToken(user.id);
    await this.emailService.sendPasswordResetEmail(user.email, resetToken);

    logger.info('Password reset requested', { userId: user.id });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Verify token
    const userId = this.tokenService.verifyPasswordResetToken(token);
    if (!userId) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Update password
    await this.userModel.updatePassword(userId, passwordHash);

    // Logout all sessions
    await this.sessionModel.deleteAllForUser(userId);

    logger.info('Password reset', { userId });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user || !user.password_hash) {
      throw new Error('Invalid user');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid current password');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Update password
    await this.userModel.updatePassword(userId, passwordHash);

    // Logout all other sessions (keep current one)
    // This would require tracking current session, simplified here
    logger.info('Password changed', { userId });
  }

  async verifyEmail(token: string): Promise<void> {
    // In a real implementation, you'd store verification tokens
    // For simplicity, we'll just extract user ID from token
    const userId = this.tokenService.verifyPasswordResetToken(token);
    if (!userId) {
      throw new Error('Invalid verification token');
    }

    await this.userModel.verifyEmail(userId);
    logger.info('Email verified', { userId });
  }
}
