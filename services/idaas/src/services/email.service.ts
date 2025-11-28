import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const verificationLink = `${config.app.url}/verify-email?token=${token}`;
    
    try {
      await this.transporter.sendMail({
        from: config.smtp.from,
        to,
        subject: 'Verify your email address',
        html: `
          <h1>Welcome to NEXUS!</h1>
          <p>Please click the link below to verify your email address:</p>
          <a href="${verificationLink}">${verificationLink}</a>
          <p>This link will expire in 24 hours.</p>
        `,
      });
      logger.info('Verification email sent', { email: to });
    } catch (error) {
      logger.error('Failed to send verification email', { error, email: to });
      throw error;
    }
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const resetLink = `${config.app.url}/reset-password?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: config.smtp.from,
        to,
        subject: 'Reset your password',
        html: `
          <h1>Password Reset Request</h1>
          <p>You requested to reset your password. Click the link below to proceed:</p>
          <a href="${resetLink}">${resetLink}</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you did not request this, please ignore this email.</p>
        `,
      });
      logger.info('Password reset email sent', { email: to });
    } catch (error) {
      logger.error('Failed to send password reset email', { error, email: to });
      throw error;
    }
  }
}
