import { Router } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { AuthService } from '../services/auth.service';
import { logger } from '../middleware/logger';

const router = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:8000/api/auth/oauth/google/callback';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export default (authService: AuthService) => {
  // Configure Google OAuth
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          callbackURL: GOOGLE_CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            const firstName = profile.name?.givenName || '';
            const lastName = profile.name?.familyName || '';

            if (!email) {
              return done(new Error('No email found in Google profile'));
            }

            const result = await authService.loginWithOAuth(
              'google',
              profile.id,
              email,
              firstName,
              lastName
            );

            done(null, result);
          } catch (error) {
            logger.error('Google OAuth error', { error });
            done(error);
          }
        }
      )
    );
  }

  // Google OAuth routes
  router.get(
    '/google',
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false,
    })
  );

  router.get(
    '/google/callback',
    passport.authenticate('google', { session: false }),
    (req: any, res) => {
      const { user, accessToken, refreshToken } = req.user;

      // Redirect to frontend with tokens
      const redirectUrl = `${FRONTEND_URL}/oauth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`;
      res.redirect(redirectUrl);
    }
  );

  // Microsoft OAuth routes (placeholder)
  router.get('/microsoft', (req, res) => {
    res.status(501).json({ error: 'Microsoft OAuth not implemented yet' });
  });

  router.get('/microsoft/callback', (req, res) => {
    res.status(501).json({ error: 'Microsoft OAuth not implemented yet' });
  });

  return router;
};
