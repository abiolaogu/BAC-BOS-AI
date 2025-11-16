import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../middleware/logger';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@nexus.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export class EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: SMTP_USER && SMTP_PASSWORD ? {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      } : undefined,
    });
  }

  async sendVerificationEmail(email: string, userId: string): Promise<void> {
    const verificationLink = `${FRONTEND_URL}/verify-email?token=${userId}`;

    try {
      await this.transporter.sendMail({
        from: EMAIL_FROM,
        to: email,
        subject: 'Verify your NEXUS account',
        html: `
          <h1>Welcome to NEXUS Office Suite!</h1>
          <p>Please verify your email address by clicking the link below:</p>
          <a href="${verificationLink}">Verify Email</a>
          <p>If you didn't create an account, you can safely ignore this email.</p>
        `,
      });

      logger.info('Verification email sent', { email });
    } catch (error) {
      logger.error('Failed to send verification email', { error, email });
      // Don't throw error to prevent blocking user registration
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetLink = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

    try {
      await this.transporter.sendMail({
        from: EMAIL_FROM,
        to: email,
        subject: 'Reset your NEXUS password',
        html: `
          <h1>Password Reset Request</h1>
          <p>You requested to reset your password. Click the link below to proceed:</p>
          <a href="${resetLink}">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        `,
      });

      logger.info('Password reset email sent', { email });
    } catch (error) {
      logger.error('Failed to send password reset email', { error, email });
    }
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: EMAIL_FROM,
        to: email,
        subject: 'Welcome to NEXUS Office Suite!',
        html: `
          <h1>Welcome, ${firstName}!</h1>
          <p>Your NEXUS account has been successfully verified.</p>
          <p>You can now access all NEXUS services:</p>
          <ul>
            <li>NEXUS Writer - Document editing</li>
            <li>NEXUS Sheets - Spreadsheets</li>
            <li>NEXUS Slides - Presentations</li>
            <li>NEXUS Drive - File storage</li>
            <li>NEXUS Meet - Video conferencing</li>
          </ul>
          <a href="${FRONTEND_URL}">Get Started</a>
        `,
      });

      logger.info('Welcome email sent', { email });
    } catch (error) {
      logger.error('Failed to send welcome email', { error, email });
    }
  }

  async sendPasswordChangedEmail(email: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: EMAIL_FROM,
        to: email,
        subject: 'Your NEXUS password was changed',
        html: `
          <h1>Password Changed</h1>
          <p>Your NEXUS account password was successfully changed.</p>
          <p>If you didn't make this change, please contact support immediately.</p>
        `,
      });

      logger.info('Password changed email sent', { email });
    } catch (error) {
      logger.error('Failed to send password changed email', { error, email });
    }
  }

  async sendMFAEnabledEmail(email: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: EMAIL_FROM,
        to: email,
        subject: 'Two-factor authentication enabled',
        html: `
          <h1>MFA Enabled</h1>
          <p>Two-factor authentication has been enabled on your NEXUS account.</p>
          <p>Your account is now more secure.</p>
          <p>If you didn't enable this, please contact support immediately.</p>
        `,
      });

      logger.info('MFA enabled email sent', { email });
    } catch (error) {
      logger.error('Failed to send MFA enabled email', { error, email });
    }
  }
}
