import { NotificationModel, CreateNotificationData, Notification } from '../models/notification';
import { PreferenceModel } from '../models/preference';
import { EmailService } from './email.service';
import { PushService } from './push.service';
import { logger } from '../middleware/logger';

export class NotificationService {
  constructor(
    private notificationModel: NotificationModel,
    private preferenceModel: PreferenceModel,
    private emailService: EmailService,
    private pushService: PushService
  ) {}

  async createNotification(data: CreateNotificationData): Promise<Notification> {
    // Create notification in database
    const notification = await this.notificationModel.create(data);

    // Get user preferences
    const preferences = await this.preferenceModel.findByUserId(data.user_id);

    if (!preferences) {
      // Create default preferences if they don't exist
      await this.preferenceModel.create(data.user_id);
    }

    // Send email notification if enabled
    if (preferences && this.shouldSendEmail(preferences, data.type)) {
      try {
        await this.emailService.sendNotificationEmail(
          data.user_id,
          data.title,
          data.message,
          data.link
        );
      } catch (error) {
        logger.error('Failed to send email notification', { error, notificationId: notification.id });
      }
    }

    // Send push notification if enabled
    if (preferences && this.shouldSendPush(preferences, data.type)) {
      try {
        await this.pushService.sendPushNotification(
          data.user_id,
          data.title,
          data.message,
          data.link
        );
      } catch (error) {
        logger.error('Failed to send push notification', { error, notificationId: notification.id });
      }
    }

    logger.info('Notification created', { notificationId: notification.id, userId: data.user_id });

    return notification;
  }

  async getNotifications(userId: string, limit: number = 50, offset: number = 0): Promise<Notification[]> {
    return this.notificationModel.findByUserId(userId, limit, offset);
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return this.notificationModel.findUnreadByUserId(userId);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countUnreadByUserId(userId);
  }

  async markAsRead(notificationId: string): Promise<Notification | null> {
    return this.notificationModel.markAsRead(notificationId);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel.markAllAsRead(userId);
    logger.info('All notifications marked as read', { userId });
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await this.notificationModel.delete(notificationId);
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.notificationModel.deleteAllForUser(userId);
  }

  private shouldSendEmail(preferences: any, type: string): boolean {
    if (!preferences.email_enabled) return false;

    switch (type) {
      case 'mention':
        return preferences.mention_email;
      case 'share':
        return preferences.share_email;
      case 'comment':
        return preferences.comment_email;
      case 'invite':
        return preferences.invite_email;
      case 'meeting':
        return preferences.meeting_email;
      default:
        return true;
    }
  }

  private shouldSendPush(preferences: any, type: string): boolean {
    if (!preferences.push_enabled) return false;

    switch (type) {
      case 'mention':
        return preferences.mention_push;
      case 'share':
        return preferences.share_push;
      case 'comment':
        return preferences.comment_push;
      case 'invite':
        return preferences.invite_push;
      case 'meeting':
        return preferences.meeting_push;
      default:
        return true;
    }
  }
}
