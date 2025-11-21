/**
 * NEXUS IDaaS - JWT Utilities
 */

import jwt from 'jsonwebtoken';
import { config } from '../config';
import { TokenPayload, TokenType, IDaaSError, ErrorCode } from '../types';
import { logger } from './logger';

/**
 * Parse JWT expiry string to seconds
 */
function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid expiry format: ${expiry}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };

  return value * multipliers[unit];
}

/**
 * Generate access token
 */
export function generateAccessToken(payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>): string {
  const expirySeconds = parseExpiry(config.jwt.accessTokenExpiry);

  return jwt.sign(
    {
      ...payload,
      type: TokenType.ACCESS,
    },
    config.jwt.secret,
    {
      expiresIn: expirySeconds,
      algorithm: config.jwt.algorithm as jwt.Algorithm,
    }
  );
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>): string {
  const expirySeconds = parseExpiry(config.jwt.refreshTokenExpiry);

  return jwt.sign(
    {
      ...payload,
      type: TokenType.REFRESH,
    },
    config.jwt.secret,
    {
      expiresIn: expirySeconds,
      algorithm: config.jwt.algorithm as jwt.Algorithm,
    }
  );
}

/**
 * Generate MFA token (short-lived, for MFA verification flow)
 */
export function generateMFAToken(payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>): string {
  return jwt.sign(
    {
      ...payload,
      type: TokenType.MFA,
    },
    config.jwt.secret,
    {
      expiresIn: 300, // 5 minutes
      algorithm: config.jwt.algorithm as jwt.Algorithm,
    }
  );
}

/**
 * Generate email verification token
 */
export function generateEmailVerificationToken(
  payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>
): string {
  return jwt.sign(
    {
      ...payload,
      type: TokenType.EMAIL_VERIFICATION,
    },
    config.jwt.secret,
    {
      expiresIn: 86400, // 24 hours
      algorithm: config.jwt.algorithm as jwt.Algorithm,
    }
  );
}

/**
 * Generate password reset token
 */
export function generatePasswordResetToken(
  payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>
): string {
  return jwt.sign(
    {
      ...payload,
      type: TokenType.PASSWORD_RESET,
    },
    config.jwt.secret,
    {
      expiresIn: 3600, // 1 hour
      algorithm: config.jwt.algorithm as jwt.Algorithm,
    }
  );
}

/**
 * Verify and decode a token
 */
export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      algorithms: [config.jwt.algorithm as jwt.Algorithm],
    }) as TokenPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new IDaaSError(
        ErrorCode.TOKEN_EXPIRED,
        'Token has expired',
        401
      );
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new IDaaSError(
        ErrorCode.INVALID_TOKEN,
        'Invalid token',
        401
      );
    } else {
      logger.error('Token verification error', { error });
      throw new IDaaSError(
        ErrorCode.INVALID_TOKEN,
        'Token verification failed',
        401
      );
    }
  }
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Get token expiry time
 */
export function getTokenExpiry(token: string): Date | null {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return null;
  }

  return new Date(decoded.exp * 1000);
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const expiry = getTokenExpiry(token);
  if (!expiry) {
    return true;
  }

  return expiry < new Date();
}

/**
 * Generate token pair (access + refresh)
 */
export function generateTokenPair(
  payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>
): {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  const expiresIn = parseExpiry(config.jwt.accessTokenExpiry);

  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
}
