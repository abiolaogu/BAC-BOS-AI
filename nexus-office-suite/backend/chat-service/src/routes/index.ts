import { Router } from 'express';
import channelsRouter from './channels';
import messagesRouter from './messages';

const router = Router();

router.use('/channels', channelsRouter);
router.use('/messages', messagesRouter);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'chat-service' });
});

export default router;
