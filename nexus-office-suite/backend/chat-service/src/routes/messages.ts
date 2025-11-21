import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import ChatService from '../services/ChatService';

const router = Router();

// Get messages for a channel
router.get('/channels/:channelId', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { channelId } = req.params;
    const { limit, offset, before, after } = req.query;

    const result = await ChatService.getMessages(channelId, userId, {
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
      before: before as string,
      after: after as string,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get thread replies
router.get('/:messageId/replies', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { messageId } = req.params;
    const { limit, offset } = req.query;

    const result = await ChatService.getThreadReplies(messageId, userId, {
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a message (for non-WebSocket clients)
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const {
      channelId,
      content,
      type,
      threadId,
      parentId,
      mentions,
      attachments,
    } = req.body;

    if (!channelId || !content) {
      res.status(400).json({ error: 'Channel ID and content are required' });
      return;
    }

    const message = await ChatService.createMessage({
      channelId,
      userId,
      content,
      type,
      threadId,
      parentId,
      mentions,
      attachments,
    });

    res.status(201).json({ message });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update a message
router.patch('/:messageId', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    const message = await ChatService.updateMessage(messageId, userId, content);

    res.json({ message });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a message
router.delete('/:messageId', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { messageId } = req.params;

    await ChatService.deleteMessage(messageId, userId);

    res.json({ message: 'Message deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add reaction
router.post('/:messageId/reactions', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      res.status(400).json({ error: 'Emoji is required' });
      return;
    }

    const message = await ChatService.addReaction(messageId, userId, emoji);

    res.json({ message });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Remove reaction
router.delete(
  '/:messageId/reactions/:emoji',
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { messageId, emoji } = req.params;

      const message = await ChatService.removeReaction(
        messageId,
        userId,
        decodeURIComponent(emoji)
      );

      res.json({ message });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Mark message as read
router.post('/:messageId/read', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { messageId } = req.params;
    const { channelId } = req.body;

    if (!channelId) {
      res.status(400).json({ error: 'Channel ID is required' });
      return;
    }

    await ChatService.markAsRead(channelId, messageId, userId);

    res.json({ message: 'Marked as read' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get unread count for a channel
router.get(
  '/channels/:channelId/unread',
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { channelId } = req.params;

      const count = await ChatService.getUnreadCount(channelId, userId);

      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Search messages
router.get('/search/query', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const {
      q,
      channelId,
      type,
      hasAttachments,
      dateFrom,
      dateTo,
      limit,
      offset,
    } = req.query;

    if (!q) {
      res.status(400).json({ error: 'Query parameter is required' });
      return;
    }

    const result = await ChatService.searchMessages(userId, {
      query: q as string,
      channelId: channelId as string,
      type: type as any,
      hasAttachments: hasAttachments === 'true',
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
