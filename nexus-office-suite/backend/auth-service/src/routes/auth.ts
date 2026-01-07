import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { AuthService } from '../services/auth.service';
import { MFAService } from '../services/mfa.service';
import { authenticate } from '../middleware/auth';
import { logger } from '../middleware/logger';
import { validatePassword } from '../utils/security';

const router = Router();

// Strong password validation pattern:
// - Minimum 8 characters (12+ recommended)
// - At least one uppercase letter
// - At least one lowercase letter
// - At least one number
// - At least one special character
const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .pattern(strongPasswordPattern)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'string.min': 'Password must be at least 8 characters long',
    }),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  tenantId: Joi.string().optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const resetPasswordRequestSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string()
    .min(8)
    .pattern(strongPasswordPattern)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'string.min': 'Password must be at least 8 characters long',
    }),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .pattern(strongPasswordPattern)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'string.min': 'Password must be at least 8 characters long',
    }),
});

export default (authService: AuthService, mfaService: MFAService) => {
  // Register
  router.post('/register', async (req: Request, res: Response) => {
    try {
      const { error, value } = registerSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const user = await authService.register({
        email: value.email,
        password: value.password,
        first_name: value.firstName,
        last_name: value.lastName,
        tenant_id: value.tenantId,
      });

      const { password_hash, mfa_secret, ...userWithoutSensitive } = user;

      res.status(201).json({
        message: 'User registered successfully. Please verify your email.',
        user: userWithoutSensitive,
      });
    } catch (err: any) {
      logger.error('Registration error', { error: err.message });
      res.status(400).json({ error: err.message });
    }
  });

  // Login
  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const deviceInfo = req.get('user-agent');
      const ipAddress = req.ip;

      const result = await authService.login(
        value.email,
        value.password,
        deviceInfo,
        ipAddress
      );

      res.json(result);
    } catch (err: any) {
      if (err.message === 'MFA_REQUIRED') {
        return res.status(200).json({ mfaRequired: true });
      }
      logger.error('Login error', { error: err.message });
      res.status(401).json({ error: err.message });
    }
  });

  // Refresh token
  router.post('/refresh', async (req: Request, res: Response) => {
    try {
      const { error, value } = refreshSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const tokens = await authService.refresh(value.refreshToken);
      res.json(tokens);
    } catch (err: any) {
      logger.error('Token refresh error', { error: err.message });
      res.status(401).json({ error: err.message });
    }
  });

  // Logout
  router.post('/logout', authenticate, async (req: Request, res: Response) => {
    try {
      const refreshToken = req.body.refreshToken;
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
      res.json({ message: 'Logged out successfully' });
    } catch (err: any) {
      logger.error('Logout error', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // Logout from all devices
  router.post('/logout-all', authenticate, async (req: Request, res: Response) => {
    try {
      await authService.logoutAll(req.user!.userId);
      res.json({ message: 'Logged out from all devices' });
    } catch (err: any) {
      logger.error('Logout all error', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // Request password reset
  router.post('/reset-password/request', async (req: Request, res: Response) => {
    try {
      const { error, value } = resetPasswordRequestSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      await authService.requestPasswordReset(value.email);
      res.json({ message: 'If the email exists, a reset link has been sent' });
    } catch (err: any) {
      logger.error('Password reset request error', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // Reset password
  router.post('/reset-password', async (req: Request, res: Response) => {
    try {
      const { error, value } = resetPasswordSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      await authService.resetPassword(value.token, value.password);
      res.json({ message: 'Password reset successfully' });
    } catch (err: any) {
      logger.error('Password reset error', { error: err.message });
      res.status(400).json({ error: err.message });
    }
  });

  // Change password (authenticated)
  router.post('/change-password', authenticate, async (req: Request, res: Response) => {
    try {
      const { error, value } = changePasswordSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      await authService.changePassword(
        req.user!.userId,
        value.currentPassword,
        value.newPassword
      );
      res.json({ message: 'Password changed successfully' });
    } catch (err: any) {
      logger.error('Password change error', { error: err.message });
      res.status(400).json({ error: err.message });
    }
  });

  // Verify email
  router.get('/verify-email/:token', async (req: Request, res: Response) => {
    try {
      await authService.verifyEmail(req.params.token);
      res.json({ message: 'Email verified successfully' });
    } catch (err: any) {
      logger.error('Email verification error', { error: err.message });
      res.status(400).json({ error: err.message });
    }
  });

  // Get current user
  router.get('/me', authenticate, async (req: Request, res: Response) => {
    res.json({ user: req.user });
  });

  return router;
};
