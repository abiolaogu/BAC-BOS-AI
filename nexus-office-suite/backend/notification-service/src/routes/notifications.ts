import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { NotificationService } from '../services/notification.service';
import { PreferenceModel } from '../models/preference';
import { authenticate } from '../middleware/auth';
import { logger } from '../middleware/logger';
import { SocketHandlers } from '../socket/handlers';

const router = Router();

const createNotificationSchema = Joi.object({
  userId: Joi.string().required(),
  type: Joi.string().valid('mention', 'share', 'comment', 'invite', 'system', 'meeting', 'file_update').required(),
  title: Joi.string().required(),
  message: Joi.string().required(),
  data: Joi.object().optional(),
  link: Joi.string().optional(),
});

const updatePreferencesSchema = Joi.object({
  email_enabled: Joi.boolean().optional(),
  push_enabled: Joi.boolean().optional(),
  mention_email: Joi.boolean().optional(),
  mention_push: Joi.boolean().optional(),
  share_email: Joi.boolean().optional(),
  share_push: Joi.boolean().optional(),
  comment_email: Joi.boolean().optional(),
  comment_push: Joi.boolean().optional(),
  invite_email: Joi.boolean().optional(),
  invite_push: Joi.boolean().optional(),
  meeting_email: Joi.boolean().optional(),
  meeting_push: Joi.boolean().optional(),
});

export default (
  notificationService: NotificationService,
  preferenceModel: PreferenceModel,
  socketHandlers: SocketHandlers
) => {
  // Get user notifications
  router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const notifications = await notificationService.getNotifications(userId, limit, offset);
      res.json(notifications);
    } catch (err: any) {
      logger.error('Failed to get notifications', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // Get unread notifications
  router.get('/unread', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const notifications = await notificationService.getUnreadNotifications(userId);
      res.json(notifications);
    } catch (err: any) {
      logger.error('Failed to get unread notifications', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // Get unread count
  router.get('/unread/count', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const count = await notificationService.getUnreadCount(userId);
      res.json({ count });
    } catch (err: any) {
      logger.error('Failed to get unread count', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // Create notification (internal API)
  router.post('/', async (req: Request, res: Response) => {
    try {
      // Verify this is an internal request (should be called by other services)
      const internalKey = req.headers['x-internal-key'];
      if (internalKey !== process.env.INTERNAL_API_KEY) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { error, value } = createNotificationSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const notification = await notificationService.createNotification({
        user_id: value.userId,
        type: value.type,
        title: value.title,
        message: value.message,
        data: value.data,
        link: value.link,
      });

      // Send real-time notification via WebSocket
      socketHandlers.sendToUser(value.userId, notification);

      // Send updated unread count
      const unreadCount = await notificationService.getUnreadCount(value.userId);
      socketHandlers.sendUnreadCountToUser(value.userId, unreadCount);

      res.status(201).json(notification);
    } catch (err: any) {
      logger.error('Failed to create notification', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // Mark notification as read
  router.patch('/:id/read', authenticate, async (req: Request, res: Response) => {
    try {
      const notification = await notificationService.markAsRead(req.params.id);
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      res.json(notification);
    } catch (err: any) {
      logger.error('Failed to mark notification as read', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // Mark all as read
  router.post('/read-all', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      await notificationService.markAllAsRead(userId);
      res.json({ message: 'All notifications marked as read' });
    } catch (err: any) {
      logger.error('Failed to mark all as read', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // Delete notification
  router.delete('/:id', authenticate, async (req: Request, res: Response) => {
    try {
      await notificationService.deleteNotification(req.params.id);
      res.json({ message: 'Notification deleted' });
    } catch (err: any) {
      logger.error('Failed to delete notification', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // Get user preferences
  router.get('/preferences', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      let preferences = await preferenceModel.findByUserId(userId);

      if (!preferences) {
        preferences = await preferenceModel.create(userId);
      }

      res.json(preferences);
    } catch (err: any) {
      logger.error('Failed to get preferences', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // Update user preferences
  router.put('/preferences', authenticate, async (req: Request, res: Response) => {
    try {
      const { error, value } = updatePreferencesSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const userId = req.user!.userId;
      const preferences = await preferenceModel.update(userId, value);

      res.json(preferences);
    } catch (err: any) {
      logger.error('Failed to update preferences', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
