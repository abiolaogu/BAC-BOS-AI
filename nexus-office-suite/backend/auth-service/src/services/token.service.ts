import jwt from 'jsonwebtoken';
import { User } from '../models/user';
import { getJwtSecret, getJwtRefreshSecret, generateSecureToken } from '../utils/security';

// Get JWT secrets with proper validation - no hardcoded fallbacks
const JWT_SECRET = getJwtSecret();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_SECRET = getJwtRefreshSecret();

export interface TokenPayload {
  userId: string;
  email: string;
  tenantId?: string;
  roles: string[];
}

export class TokenService {
  generateAccessToken(user: User): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      tenantId: user.tenant_id,
      roles: user.roles,
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      algorithm: 'HS256',
    });
  }

  generateRefreshToken(): string {
    // Use cryptographically secure random token
    return generateSecureToken(32);
  }

  verifyAccessToken(token: string): TokenPayload | null {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
      return payload;
    } catch (error) {
      return null;
    }
  }

  generatePasswordResetToken(userId: string): string {
    return jwt.sign({ userId, type: 'password-reset' }, JWT_SECRET, {
      expiresIn: '1h',
    });
  }

  verifyPasswordResetToken(token: string): string | null {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string; type: string };
      if (payload.type !== 'password-reset') {
        return null;
      }
      return payload.userId;
    } catch (error) {
      return null;
    }
  }

  generateEmailVerificationToken(userId: string): string {
    return jwt.sign({ userId, type: 'email-verification' }, JWT_SECRET, {
      expiresIn: '24h',
    });
  }

  verifyEmailVerificationToken(token: string): string | null {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string; type: string };
      if (payload.type !== 'email-verification') {
        return null;
      }
      return payload.userId;
    } catch (error) {
      return null;
    }
  }

  decodeToken(token: string): any {
    return jwt.decode(token);
  }
}
