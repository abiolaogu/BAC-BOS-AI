import webpush from 'web-push';
import { logger } from '../middleware/logger';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@nexus.com';

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class PushService {
  constructor() {
    if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    }
  }

  async sendPushNotification(
    userId: string,
    title: string,
    message: string,
    link?: string
  ): Promise<void> {
    // In a real implementation, you would fetch the user's push subscriptions from database
    // For now, this is a placeholder

    const payload = JSON.stringify({
      title,
      body: message,
      icon: '/logo.png',
      badge: '/badge.png',
      data: {
        url: link || '/',
      },
    });

    try {
      // Fetch subscriptions for user (placeholder)
      const subscriptions = await this.getUserSubscriptions(userId);

      const sendPromises = subscriptions.map((subscription) =>
        webpush.sendNotification(subscription, payload).catch((error) => {
          logger.error('Failed to send push to subscription', { error, userId });
          // Remove invalid subscription
          this.removeSubscription(userId, subscription);
        })
      );

      await Promise.all(sendPromises);

      logger.info('Push notifications sent', { userId, count: subscriptions.length });
    } catch (error) {
      logger.error('Failed to send push notifications', { error, userId });
      throw error;
    }
  }

  async saveSubscription(userId: string, subscription: PushSubscription): Promise<void> {
    // In a real implementation, save to database
    logger.info('Push subscription saved', { userId });
  }

  async removeSubscription(userId: string, subscription: PushSubscription): Promise<void> {
    // In a real implementation, remove from database
    logger.info('Push subscription removed', { userId });
  }

  private async getUserSubscriptions(userId: string): Promise<PushSubscription[]> {
    // In a real implementation, fetch from database
    return [];
  }

  getPublicKey(): string {
    return VAPID_PUBLIC_KEY;
  }
}
