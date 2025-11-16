import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../middleware/logger';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || 'notifications@nexus.com';
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

  async sendNotificationEmail(
    userId: string,
    title: string,
    message: string,
    link?: string
  ): Promise<void> {
    // In a real implementation, you would fetch the user's email from a user service
    // For now, we'll use a placeholder
    const userEmail = `user-${userId}@example.com`;

    try {
      const linkHtml = link
        ? `<p><a href="${FRONTEND_URL}${link}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">View Details</a></p>`
        : '';

      await this.transporter.sendMail({
        from: EMAIL_FROM,
        to: userEmail,
        subject: `NEXUS: ${title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">${title}</h2>
            <p style="color: #666; line-height: 1.6;">${message}</p>
            ${linkHtml}
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px;">
              You received this email because you have notifications enabled in your NEXUS account settings.
              <a href="${FRONTEND_URL}/settings/notifications">Manage your notification preferences</a>
            </p>
          </div>
        `,
      });

      logger.info('Notification email sent', { userId, title });
    } catch (error) {
      logger.error('Failed to send notification email', { error, userId, title });
      throw error;
    }
  }

  async sendDigestEmail(userId: string, notifications: any[]): Promise<void> {
    const userEmail = `user-${userId}@example.com`;

    try {
      const notificationsList = notifications
        .map(
          (n) => `
          <li style="margin-bottom: 15px;">
            <strong>${n.title}</strong><br>
            <span style="color: #666;">${n.message}</span><br>
            <small style="color: #999;">${new Date(n.created_at).toLocaleString()}</small>
          </li>
        `
        )
        .join('');

      await this.transporter.sendMail({
        from: EMAIL_FROM,
        to: userEmail,
        subject: `NEXUS: You have ${notifications.length} new notifications`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Your Daily Notification Summary</h2>
            <p style="color: #666;">You have ${notifications.length} new notifications:</p>
            <ul style="list-style: none; padding: 0;">
              ${notificationsList}
            </ul>
            <p>
              <a href="${FRONTEND_URL}/notifications" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">View All Notifications</a>
            </p>
          </div>
        `,
      });

      logger.info('Digest email sent', { userId, count: notifications.length });
    } catch (error) {
      logger.error('Failed to send digest email', { error, userId });
      throw error;
    }
  }
}
