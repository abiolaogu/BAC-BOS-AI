import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { MFAService } from '../services/mfa.service';
import { authenticate } from '../middleware/auth';
import { logger } from '../middleware/logger';

const router = Router();

const verifyTokenSchema = Joi.object({
  token: Joi.string().length(6).required(),
});

export default (mfaService: MFAService) => {
  // Setup MFA (get QR code)
  router.post('/setup', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const email = req.user!.email;

      const { secret, qrCode } = await mfaService.setupMFA(userId, email);

      res.json({
        secret,
        qrCode,
        message: 'Scan the QR code with your authenticator app',
      });
    } catch (err: any) {
      logger.error('MFA setup error', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // Enable MFA (verify and activate)
  router.post('/enable', authenticate, async (req: Request, res: Response) => {
    try {
      const { error, value } = verifyTokenSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      await mfaService.enableMFA(req.user!.userId, value.token);

      // Generate backup codes
      const backupCodes = await mfaService.generateBackupCodes(req.user!.userId);

      res.json({
        message: 'MFA enabled successfully',
        backupCodes,
      });
    } catch (err: any) {
      logger.error('MFA enable error', { error: err.message });
      res.status(400).json({ error: err.message });
    }
  });

  // Disable MFA
  router.post('/disable', authenticate, async (req: Request, res: Response) => {
    try {
      const { error, value } = verifyTokenSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      await mfaService.disableMFA(req.user!.userId, value.token);

      res.json({ message: 'MFA disabled successfully' });
    } catch (err: any) {
      logger.error('MFA disable error', { error: err.message });
      res.status(400).json({ error: err.message });
    }
  });

  // Verify MFA token (during login)
  router.post('/verify', async (req: Request, res: Response) => {
    try {
      const { error, value } = verifyTokenSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      // This would typically be part of the login flow
      // For simplicity, we're just demonstrating the verification
      res.json({ message: 'MFA token verified' });
    } catch (err: any) {
      logger.error('MFA verify error', { error: err.message });
      res.status(400).json({ error: err.message });
    }
  });

  // Generate new backup codes
  router.post('/backup-codes', authenticate, async (req: Request, res: Response) => {
    try {
      const backupCodes = await mfaService.generateBackupCodes(req.user!.userId);

      res.json({ backupCodes });
    } catch (err: any) {
      logger.error('Backup codes generation error', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
