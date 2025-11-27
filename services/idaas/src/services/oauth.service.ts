/**
 * NEXUS IDaaS - OAuth Service
 * Social login with Google, Microsoft, GitHub, LinkedIn
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  User,
  UserStatus,
  OAuthProvider,
  OAuthProviderType,
  IDaaSError,
  ErrorCode,
} from '../types';
import { db } from '../database';
import { cache } from '../utils/cache';
import { logger } from '../utils/logger';
import { generateTokenPair } from '../utils/jwt';
import { encrypt, decrypt } from '../utils/crypto';
import { config } from '../config';
import { AuditService } from './audit.service';

interface OAuthUserInfo {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  emailVerified?: boolean;
}

interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export class OAuthService {
  private auditService: AuditService;

  constructor() {
    this.auditService = new AuditService();
  }

  /**
   * Get OAuth authorization URL
   */
  async getAuthorizationUrl(
    provider: OAuthProviderType,
    redirectUri: string,
    state?: string
  ): Promise<string> {
    const providerConfig = this.getProviderConfig(provider);
    const stateToken = state || this.generateState();

    // Store state for validation
    await cache.set(`oauth:state:${stateToken}`, {
      provider,
      redirectUri,
      createdAt: new Date(),
    }, 600); // 10 minutes

    const params = new URLSearchParams({
      client_id: providerConfig.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: providerConfig.scope.join(' '),
      state: stateToken,
      ...(provider === OAuthProviderType.GOOGLE && {
        access_type: 'offline',
        prompt: 'consent',
      }),
      ...(provider === OAuthProviderType.MICROSOFT && {
        response_mode: 'query',
      }),
    });

    return `${providerConfig.authorizationURL}?${params.toString()}`;
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(
    provider: OAuthProviderType,
    code: string,
    state: string,
    redirectUri: string,
    ipAddress: string = '0.0.0.0'
  ): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
    isNewUser: boolean;
  }> {
    // Validate state
    const stateData = await cache.get<any>(`oauth:state:${state}`);
    if (!stateData || stateData.provider !== provider) {
      throw new IDaaSError(
        ErrorCode.INVALID_REQUEST,
        'Invalid state parameter',
        400
      );
    }

    // Delete state token (one-time use)
    await cache.delete(`oauth:state:${state}`);

    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(
      provider,
      code,
      redirectUri
    );

    // Get user info from provider
    const userInfo = await this.getUserInfo(provider, tokens.access_token);

    // Find or create user
    let user = await this.findOrCreateUser(userInfo, provider, ipAddress);

    // Store OAuth connection
    await this.storeOAuthConnection(
      user.id,
      provider,
      userInfo.id,
      tokens,
      userInfo
    );

    // Generate JWT tokens
    const jwtTokens = generateTokenPair({
      userId: user.id,
      email: user.email,
    });

    // Audit log
    await this.auditService.log({
      userId: user.id,
      action: 'login',
      resource: 'oauth',
      ipAddress,
      status: 'success',
      details: { provider, method: 'oauth' },
    });

    return {
      user,
      accessToken: jwtTokens.accessToken,
      refreshToken: jwtTokens.refreshToken,
      isNewUser: user.status === UserStatus.PENDING,
    };
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(
    provider: OAuthProviderType,
    code: string,
    redirectUri: string
  ): Promise<OAuthTokenResponse> {
    const providerConfig = this.getProviderConfig(provider);

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: providerConfig.clientId,
      client_secret: providerConfig.clientSecret,
      ...(provider === OAuthProviderType.GITHUB && {
        scope: providerConfig.scope.join(' '),
      }),
    });

    try {
      const response = await axios.post<OAuthTokenResponse>(
        providerConfig.tokenURL,
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error('OAuth token exchange failed', {
        provider,
        error: error.response?.data || error.message,
      });
      throw new IDaaSError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to exchange authorization code',
        500
      );
    }
  }

  /**
   * Get user info from OAuth provider
   */
  private async getUserInfo(
    provider: OAuthProviderType,
    accessToken: string
  ): Promise<OAuthUserInfo> {
    const providerConfig = this.getProviderConfig(provider);

    try {
      const response = await axios.get(providerConfig.userInfoURL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      const data = response.data;

      // Normalize user info based on provider
      switch (provider) {
        case OAuthProviderType.GOOGLE:
          return {
            id: data.sub || data.id,
            email: data.email,
            firstName: data.given_name,
            lastName: data.family_name,
            avatar: data.picture,
            emailVerified: data.email_verified,
          };

        case OAuthProviderType.MICROSOFT:
          return {
            id: data.id,
            email: data.userPrincipalName || data.mail,
            firstName: data.givenName,
            lastName: data.surname,
            avatar: null,
            emailVerified: true, // Microsoft always verifies
          };

        case OAuthProviderType.GITHUB:
          return {
            id: data.id.toString(),
            email: data.email,
            firstName: data.name?.split(' ')[0],
            lastName: data.name?.split(' ').slice(1).join(' '),
            avatar: data.avatar_url,
            emailVerified: true, // GitHub requires verified email
          };

        case OAuthProviderType.LINKEDIN:
          return {
            id: data.id,
            email: data.email,
            firstName: data.localizedFirstName,
            lastName: data.localizedLastName,
            avatar: data.profilePicture?.displayImage,
            emailVerified: true,
          };

        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error: any) {
      logger.error('Failed to get user info from OAuth provider', {
        provider,
        error: error.response?.data || error.message,
      });
      throw new IDaaSError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to get user information',
        500
      );
    }
  }

  /**
   * Find or create user from OAuth data
   */
  private async findOrCreateUser(
    userInfo: OAuthUserInfo,
    provider: OAuthProviderType,
    ipAddress: string
  ): Promise<User> {
    // Try to find existing user by email
    let user = await db.queryOne<User>(
      'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
      [userInfo.email.toLowerCase()]
    );

    if (user) {
      // Update user info if needed
      if (!user.emailVerified && userInfo.emailVerified) {
        await db.query(
          `UPDATE users
           SET email_verified = true,
               status = $1,
               first_name = COALESCE(first_name, $2),
               last_name = COALESCE(last_name, $3),
               avatar = COALESCE(avatar, $4),
               last_login_at = NOW(),
               last_login_ip = $5
           WHERE id = $6`,
          [
            UserStatus.ACTIVE,
            userInfo.firstName,
            userInfo.lastName,
            userInfo.avatar,
            ipAddress,
            user.id,
          ]
        );

        user = await db.queryOne<User>(
          'SELECT * FROM users WHERE id = $1',
          [user.id]
        );
      }

      return user!;
    }

    // Create new user
    user = await db.queryOne<User>(
      `INSERT INTO users (
        email, first_name, last_name, avatar,
        email_verified, status, last_login_at, last_login_ip
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
      RETURNING *`,
      [
        userInfo.email.toLowerCase(),
        userInfo.firstName,
        userInfo.lastName,
        userInfo.avatar,
        userInfo.emailVerified || false,
        UserStatus.ACTIVE,
        ipAddress,
      ]
    );

    if (!user) {
      throw new IDaaSError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to create user',
        500
      );
    }

    logger.info('User created via OAuth', {
      userId: user.id,
      email: user.email,
      provider,
    });

    return user;
  }

  /**
   * Store OAuth connection
   */
  private async storeOAuthConnection(
    userId: string,
    provider: OAuthProviderType,
    providerUserId: string,
    tokens: OAuthTokenResponse,
    profileData: OAuthUserInfo
  ): Promise<void> {
    // Check if connection already exists
    const existing = await db.queryOne(
      `SELECT id FROM oauth_connections
       WHERE user_id = $1 AND provider_id = (
         SELECT id FROM oauth_providers WHERE type = $2 LIMIT 1
       )`,
      [userId, provider]
    );

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? encrypt(tokens.refresh_token)
      : null;

    if (existing) {
      // Update existing connection
      await db.query(
        `UPDATE oauth_connections
         SET access_token_encrypted = $1,
             refresh_token_encrypted = $2,
             expires_at = $3,
             profile_data = $4,
             updated_at = NOW()
         WHERE id = $5`,
        [
          encryptedAccessToken,
          encryptedRefreshToken,
          expiresAt,
          JSON.stringify(profileData),
          existing.id,
        ]
      );
    } else {
      // Get or create provider
      let providerRecord = await db.queryOne<{ id: string }>(
        'SELECT id FROM oauth_providers WHERE type = $1 AND organization_id IS NULL',
        [provider]
      );

      if (!providerRecord) {
        const providerConfig = this.getProviderConfig(provider);
        providerRecord = await db.queryOne(
          `INSERT INTO oauth_providers (
            name, type, client_id, client_secret_encrypted,
            authorization_url, token_url, user_info_url, scopes, enabled
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
          RETURNING id`,
          [
            provider,
            provider,
            providerConfig.clientId,
            encrypt(providerConfig.clientSecret),
            providerConfig.authorizationURL,
            providerConfig.tokenURL,
            providerConfig.userInfoURL,
            providerConfig.scope,
          ]
        );
      }

      // Create new connection
      await db.query(
        `INSERT INTO oauth_connections (
          user_id, provider_id, provider_user_id,
          access_token_encrypted, refresh_token_encrypted,
          expires_at, profile_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId,
          providerRecord!.id,
          providerUserId,
          encryptedAccessToken,
          encryptedRefreshToken,
          expiresAt,
          JSON.stringify(profileData),
        ]
      );
    }
  }

  /**
   * Disconnect OAuth provider
   */
  async disconnect(userId: string, provider: OAuthProviderType): Promise<void> {
    await db.query(
      `DELETE FROM oauth_connections
       WHERE user_id = $1 AND provider_id = (
         SELECT id FROM oauth_providers WHERE type = $2
       )`,
      [userId, provider]
    );

    logger.info('OAuth provider disconnected', { userId, provider });
  }

  /**
   * Get user's OAuth connections
   */
  async getUserConnections(userId: string): Promise<any[]> {
    return await db.queryMany(
      `SELECT
        p.type as provider,
        p.name,
        oc.provider_user_id,
        oc.expires_at,
        oc.created_at,
        oc.updated_at
       FROM oauth_connections oc
       JOIN oauth_providers p ON oc.provider_id = p.id
       WHERE oc.user_id = $1`,
      [userId]
    );
  }

  /**
   * Get provider configuration
   */
  private getProviderConfig(provider: OAuthProviderType): {
    clientId: string;
    clientSecret: string;
    authorizationURL: string;
    tokenURL: string;
    userInfoURL: string;
    scope: string[];
  } {
    switch (provider) {
      case OAuthProviderType.GOOGLE:
        if (!config.oauth.google.enabled || !config.oauth.google.clientId) {
          throw new IDaaSError(
            ErrorCode.INVALID_REQUEST,
            'Google OAuth is not configured',
            400
          );
        }
        return {
          clientId: config.oauth.google.clientId!,
          clientSecret: config.oauth.google.clientSecret!,
          authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenURL: 'https://oauth2.googleapis.com/token',
          userInfoURL: 'https://www.googleapis.com/oauth2/v2/userinfo',
          scope: ['openid', 'profile', 'email'],
        };

      case OAuthProviderType.MICROSOFT:
        if (!config.oauth.microsoft.enabled || !config.oauth.microsoft.clientId) {
          throw new IDaaSError(
            ErrorCode.INVALID_REQUEST,
            'Microsoft OAuth is not configured',
            400
          );
        }
        return {
          clientId: config.oauth.microsoft.clientId!,
          clientSecret: config.oauth.microsoft.clientSecret!,
          authorizationURL: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
          tokenURL: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
          userInfoURL: 'https://graph.microsoft.com/v1.0/me',
          scope: ['openid', 'profile', 'email', 'User.Read'],
        };

      case OAuthProviderType.GITHUB:
        if (!config.oauth.github.enabled || !config.oauth.github.clientId) {
          throw new IDaaSError(
            ErrorCode.INVALID_REQUEST,
            'GitHub OAuth is not configured',
            400
          );
        }
        return {
          clientId: config.oauth.github.clientId!,
          clientSecret: config.oauth.github.clientSecret!,
          authorizationURL: 'https://github.com/login/oauth/authorize',
          tokenURL: 'https://github.com/login/oauth/access_token',
          userInfoURL: 'https://api.github.com/user',
          scope: ['read:user', 'user:email'],
        };

      default:
        throw new IDaaSError(
          ErrorCode.INVALID_REQUEST,
          `Unsupported OAuth provider: ${provider}`,
          400
        );
    }
  }

  /**
   * Generate state token
   */
  private generateState(): string {
    return uuidv4();
  }
}
