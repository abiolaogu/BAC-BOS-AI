/**
 * NEXUS IDaaS - OAuth Controller
 */

import { Request, Response } from 'express';
import { OAuthService } from '../services/oauth.service';
import { OAuthProviderType } from '../types';
import { logger } from '../utils/logger';

const oauthService = new OAuthService();

/**
 * Initiate OAuth flow
 * GET /api/v1/oauth/:provider
 */
export async function initiateOAuth(req: Request, res: Response): Promise<void> {
  const { provider } = req.params;
  const redirectUri = req.query.redirect_uri as string ||
    `${req.protocol}://${req.get('host')}/api/v1/oauth/${provider}/callback`;

  const authUrl = await oauthService.getAuthorizationUrl(
    provider as OAuthProviderType,
    redirectUri
  );

  res.json({
    success: true,
    data: {
      authorizationUrl: authUrl,
    },
  });
}

/**
 * Handle OAuth callback
 * GET /api/v1/oauth/:provider/callback
 */
export async function handleOAuthCallback(req: Request, res: Response): Promise<void> {
  const { provider } = req.params;
  const { code, state } = req.query;
  const ipAddress = req.ip || req.socket.remoteAddress || '0.0.0.0';

  if (!code || !state) {
    res.status(400).json({
      success: false,
      error: {
        code: 'invalid_request',
        message: 'Missing code or state parameter',
      },
    });
    return;
  }

  const redirectUri = `${req.protocol}://${req.get('host')}/api/v1/oauth/${provider}/callback`;

  const result = await oauthService.handleCallback(
    provider as OAuthProviderType,
    code as string,
    state as string,
    redirectUri,
    ipAddress
  );

  res.json({
    success: true,
    data: {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        avatar: result.user.avatar,
        emailVerified: result.user.emailVerified,
      },
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      isNewUser: result.isNewUser,
    },
  });
}

/**
 * Disconnect OAuth provider
 * DELETE /api/v1/oauth/:provider
 */
export async function disconnectOAuth(req: Request, res: Response): Promise<void> {
  const { provider } = req.params;
  const userId = req.user!.userId;

  await oauthService.disconnect(userId, provider as OAuthProviderType);

  res.json({
    success: true,
    data: {
      message: `${provider} disconnected successfully`,
    },
  });
}

/**
 * Get user's OAuth connections
 * GET /api/v1/oauth/connections
 */
export async function getConnections(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;

  const connections = await oauthService.getUserConnections(userId);

  res.json({
    success: true,
    data: connections,
  });
}
