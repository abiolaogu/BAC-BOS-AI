import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import ChannelService from '../services/ChannelService';
import { ChannelType } from '../types';

const router = Router();

// Get user's channels
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const channels = await ChannelService.getUserChannels(userId);

    res.json({ channels });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new channel
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { name, description, type, isPrivate, memberIds } = req.body;

    if (!name || !type) {
      res.status(400).json({ error: 'Name and type are required' });
      return;
    }

    const channel = await ChannelService.createChannel({
      name,
      description,
      type,
      isPrivate: isPrivate || false,
      createdBy: userId,
      memberIds,
    });

    res.status(201).json({ channel });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create direct message channel
router.post('/direct', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { recipientId } = req.body;

    if (!recipientId) {
      res.status(400).json({ error: 'Recipient ID is required' });
      return;
    }

    const channel = await ChannelService.createDirectMessage(userId, recipientId);

    res.status(201).json({ channel });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get channel by ID
router.get('/:channelId', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { channelId } = req.params;

    const channel = await ChannelService.getChannel(channelId, userId);

    res.json({ channel });
  } catch (error: any) {
    res.status(error.message.includes('not found') ? 404 : 500).json({
      error: error.message,
    });
  }
});

// Update channel
router.patch('/:channelId', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { channelId } = req.params;
    const { name, description, avatar, settings } = req.body;

    const channel = await ChannelService.updateChannel(channelId, userId, {
      name,
      description,
      avatar,
      settings,
    });

    res.json({ channel });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete channel
router.delete('/:channelId', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { channelId } = req.params;

    await ChannelService.deleteChannel(channelId, userId);

    res.json({ message: 'Channel deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add member to channel
router.post('/:channelId/members', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { channelId } = req.params;
    const { memberId } = req.body;

    if (!memberId) {
      res.status(400).json({ error: 'Member ID is required' });
      return;
    }

    const member = await ChannelService.addMember(channelId, memberId, userId);

    res.status(201).json({ member });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Remove member from channel
router.delete(
  '/:channelId/members/:memberId',
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { channelId, memberId } = req.params;

      await ChannelService.removeMember(channelId, memberId, userId);

      res.json({ message: 'Member removed successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update member role
router.patch(
  '/:channelId/members/:memberId/role',
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { channelId, memberId } = req.params;
      const { role } = req.body;

      if (!role) {
        res.status(400).json({ error: 'Role is required' });
        return;
      }

      const member = await ChannelService.updateMemberRole(
        channelId,
        memberId,
        role,
        userId
      );

      res.json({ member });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Search channels
router.get('/search/query', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { q } = req.query;

    if (!q) {
      res.status(400).json({ error: 'Query parameter is required' });
      return;
    }

    const channels = await ChannelService.searchChannels(q as string, userId);

    res.json({ channels });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
