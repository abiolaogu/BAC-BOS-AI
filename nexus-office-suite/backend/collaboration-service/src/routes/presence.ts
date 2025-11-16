import { Router, Request, Response } from 'express';
import { PresenceService } from '../services/presence.service';
import { authenticate } from '../middleware/auth';
import { logger } from '../middleware/logger';

const router = Router();

export default (presenceService: PresenceService) => {
  // Get user presence
  router.get('/users/:userId', authenticate, async (req: Request, res: Response) => {
    try {
      const presence = await presenceService.getUserPresence(req.params.userId);

      if (!presence) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(presence);
    } catch (err: any) {
      logger.error('Failed to get user presence', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // Get document presence
  router.get('/documents/:documentId', authenticate, async (req: Request, res: Response) => {
    try {
      const presence = await presenceService.getDocumentPresence(req.params.documentId);
      res.json(presence);
    } catch (err: any) {
      logger.error('Failed to get document presence', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
