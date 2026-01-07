/**
 * Service-to-Service Authentication Module
 *
 * This module provides secure authentication for inter-service communication.
 * It supports:
 * - Service JWT tokens for API authentication
 * - Service identity verification
 * - Request signing for additional security
 */

import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * Service Identity Configuration
 */
export interface ServiceIdentity {
  serviceId: string;
  serviceName: string;
  permissions: string[];
}

/**
 * Known services in the platform
 */
const KNOWN_SERVICES: Record<string, ServiceIdentity> = {
  'auth-service': {
    serviceId: 'auth-service',
    serviceName: 'Authentication Service',
    permissions: ['user:read', 'user:write', 'session:manage'],
  },
  'api-gateway': {
    serviceId: 'api-gateway',
    serviceName: 'API Gateway',
    permissions: ['*'], // Gateway has full access for routing
  },
  'crm-service': {
    serviceId: 'crm-service',
    serviceName: 'CRM Service',
    permissions: ['crm:read', 'crm:write', 'user:read'],
  },
  'finance-service': {
    serviceId: 'finance-service',
    serviceName: 'Finance Service',
    permissions: ['finance:read', 'finance:write', 'user:read'],
  },
  'documents-service': {
    serviceId: 'documents-service',
    serviceName: 'Documents Service',
    permissions: ['documents:read', 'documents:write', 'user:read'],
  },
  'hr-service': {
    serviceId: 'hr-service',
    serviceName: 'HR Service',
    permissions: ['hr:read', 'hr:write', 'user:read'],
  },
  'ai-service': {
    serviceId: 'ai-service',
    serviceName: 'AI Service',
    permissions: ['ai:execute', 'user:read'],
  },
  'notification-service': {
    serviceId: 'notification-service',
    serviceName: 'Notification Service',
    permissions: ['notification:send', 'user:read'],
  },
  'collaboration-service': {
    serviceId: 'collaboration-service',
    serviceName: 'Collaboration Service',
    permissions: ['collaboration:manage', 'user:read'],
  },
};

/**
 * Get service secret from environment
 * Each service should have a unique secret for signing requests
 */
function getServiceSecret(): string {
  const secret = process.env.SERVICE_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SERVICE_SECRET is required for service-to-service authentication');
    }
    console.warn('⚠️  Using development SERVICE_SECRET. Set SERVICE_SECRET for production.');
    return 'dev-service-secret-do-not-use-in-production';
  }
  return secret;
}

/**
 * Generate a service token for inter-service communication
 */
export function generateServiceToken(
  sourceServiceId: string,
  targetServiceId: string,
  ttlSeconds: number = 60
): string {
  const secret = getServiceSecret();
  const timestamp = Date.now();
  const expiresAt = timestamp + ttlSeconds * 1000;
  const nonce = crypto.randomBytes(16).toString('hex');

  const payload = {
    src: sourceServiceId,
    tgt: targetServiceId,
    iat: timestamp,
    exp: expiresAt,
    nonce,
  };

  const payloadString = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadString).toString('base64url');

  // Create HMAC signature
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadBase64)
    .digest('base64url');

  return `${payloadBase64}.${signature}`;
}

/**
 * Verify a service token
 */
export function verifyServiceToken(
  token: string,
  expectedTargetServiceId: string
): { valid: boolean; sourceServiceId?: string; error?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) {
      return { valid: false, error: 'Invalid token format' };
    }

    const [payloadBase64, signature] = parts;
    const secret = getServiceSecret();

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadBase64)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return { valid: false, error: 'Invalid signature' };
    }

    // Parse payload
    const payloadString = Buffer.from(payloadBase64, 'base64url').toString();
    const payload = JSON.parse(payloadString);

    // Check expiration
    if (payload.exp < Date.now()) {
      return { valid: false, error: 'Token expired' };
    }

    // Check target service
    if (payload.tgt !== expectedTargetServiceId && payload.tgt !== '*') {
      return { valid: false, error: 'Token not intended for this service' };
    }

    // Verify source service is known
    if (!KNOWN_SERVICES[payload.src]) {
      return { valid: false, error: 'Unknown source service' };
    }

    return { valid: true, sourceServiceId: payload.src };
  } catch (error) {
    return { valid: false, error: 'Token verification failed' };
  }
}

/**
 * Generate request signature for additional security
 */
export function signRequest(
  method: string,
  path: string,
  timestamp: number,
  body?: string
): string {
  const secret = getServiceSecret();
  const dataToSign = `${method}:${path}:${timestamp}:${body || ''}`;

  return crypto
    .createHmac('sha256', secret)
    .update(dataToSign)
    .digest('hex');
}

/**
 * Verify request signature
 */
export function verifyRequestSignature(
  method: string,
  path: string,
  timestamp: number,
  providedSignature: string,
  body?: string
): boolean {
  // Check timestamp is within 5 minutes
  const now = Date.now();
  if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
    return false;
  }

  const expectedSignature = signRequest(method, path, timestamp, body);

  return crypto.timingSafeEqual(
    Buffer.from(providedSignature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Express middleware for authenticating service-to-service requests
 */
export function serviceAuthMiddleware(currentServiceId: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const serviceToken = req.headers['x-service-token'] as string;
    const serviceSignature = req.headers['x-service-signature'] as string;
    const serviceTimestamp = parseInt(req.headers['x-service-timestamp'] as string, 10);

    // Check if this is a service-to-service request
    if (!serviceToken) {
      // Not a service request, proceed normally
      next();
      return;
    }

    // Verify service token
    const tokenResult = verifyServiceToken(serviceToken, currentServiceId);
    if (!tokenResult.valid) {
      res.status(401).json({
        error: 'Service authentication failed',
        details: tokenResult.error,
      });
      return;
    }

    // Optionally verify request signature if provided
    if (serviceSignature && serviceTimestamp) {
      const body = req.body ? JSON.stringify(req.body) : '';
      const signatureValid = verifyRequestSignature(
        req.method,
        req.path,
        serviceTimestamp,
        serviceSignature,
        body
      );

      if (!signatureValid) {
        res.status(401).json({
          error: 'Service request signature verification failed',
        });
        return;
      }
    }

    // Add service identity to request
    (req as any).serviceIdentity = {
      serviceId: tokenResult.sourceServiceId,
      ...KNOWN_SERVICES[tokenResult.sourceServiceId!],
    };

    next();
  };
}

/**
 * Check if a service has a specific permission
 */
export function hasServicePermission(
  serviceIdentity: ServiceIdentity | undefined,
  requiredPermission: string
): boolean {
  if (!serviceIdentity) {
    return false;
  }

  // Wildcard permission grants all access
  if (serviceIdentity.permissions.includes('*')) {
    return true;
  }

  // Check for exact permission match
  if (serviceIdentity.permissions.includes(requiredPermission)) {
    return true;
  }

  // Check for category wildcard (e.g., 'user:*' matches 'user:read')
  const [category] = requiredPermission.split(':');
  if (serviceIdentity.permissions.includes(`${category}:*`)) {
    return true;
  }

  return false;
}

/**
 * Express middleware to require specific service permission
 */
export function requireServicePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const serviceIdentity = (req as any).serviceIdentity as ServiceIdentity | undefined;

    if (!serviceIdentity) {
      res.status(401).json({
        error: 'Service authentication required',
      });
      return;
    }

    if (!hasServicePermission(serviceIdentity, permission)) {
      res.status(403).json({
        error: 'Insufficient service permissions',
        required: permission,
      });
      return;
    }

    next();
  };
}

/**
 * HTTP client helper for making authenticated service-to-service requests
 */
export interface ServiceRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export function createServiceRequestHeaders(
  sourceServiceId: string,
  targetServiceId: string,
  options: ServiceRequestOptions
): Record<string, string> {
  const timestamp = Date.now();
  const serviceToken = generateServiceToken(sourceServiceId, targetServiceId);
  const body = options.body ? JSON.stringify(options.body) : '';
  const signature = signRequest(options.method, options.path, timestamp, body);

  return {
    'X-Service-Token': serviceToken,
    'X-Service-Timestamp': timestamp.toString(),
    'X-Service-Signature': signature,
    'X-Source-Service': sourceServiceId,
    'Content-Type': 'application/json',
    ...options.headers,
  };
}
