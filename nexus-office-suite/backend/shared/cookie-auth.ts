/**
 * HTTP-Only Cookie Authentication Module
 *
 * This module provides secure token storage using HTTP-only cookies
 * instead of localStorage, protecting against XSS attacks.
 */

import { Request, Response, CookieOptions } from 'express';

/**
 * Cookie configuration for different environments
 */
export interface CookieConfig {
  accessTokenName: string;
  refreshTokenName: string;
  csrfTokenName: string;
  domain?: string;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  httpOnly: boolean;
  path: string;
}

/**
 * Get cookie configuration based on environment
 */
export function getCookieConfig(): CookieConfig {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    accessTokenName: process.env.ACCESS_TOKEN_COOKIE_NAME || 'nexus_access_token',
    refreshTokenName: process.env.REFRESH_TOKEN_COOKIE_NAME || 'nexus_refresh_token',
    csrfTokenName: process.env.CSRF_TOKEN_COOKIE_NAME || 'nexus_csrf_token',
    domain: process.env.COOKIE_DOMAIN,
    secure: isProduction || process.env.COOKIE_SECURE === 'true',
    sameSite: isProduction ? 'strict' : 'lax',
    httpOnly: true,
    path: '/',
  };
}

/**
 * Token expiration times (in milliseconds)
 */
export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: 60 * 60 * 1000, // 1 hour
  REFRESH_TOKEN: 7 * 24 * 60 * 60 * 1000, // 7 days
  CSRF_TOKEN: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * Create cookie options for access token
 */
export function getAccessTokenCookieOptions(): CookieOptions {
  const config = getCookieConfig();

  return {
    httpOnly: true,
    secure: config.secure,
    sameSite: config.sameSite,
    path: config.path,
    domain: config.domain,
    maxAge: TOKEN_EXPIRY.ACCESS_TOKEN,
  };
}

/**
 * Create cookie options for refresh token
 */
export function getRefreshTokenCookieOptions(): CookieOptions {
  const config = getCookieConfig();

  return {
    httpOnly: true,
    secure: config.secure,
    sameSite: config.sameSite,
    path: '/auth/refresh', // Only sent to refresh endpoint
    domain: config.domain,
    maxAge: TOKEN_EXPIRY.REFRESH_TOKEN,
  };
}

/**
 * Create cookie options for CSRF token
 * Note: CSRF token is NOT httpOnly so JavaScript can read it
 */
export function getCsrfTokenCookieOptions(): CookieOptions {
  const config = getCookieConfig();

  return {
    httpOnly: false, // Must be readable by JavaScript
    secure: config.secure,
    sameSite: config.sameSite,
    path: config.path,
    domain: config.domain,
    maxAge: TOKEN_EXPIRY.CSRF_TOKEN,
  };
}

/**
 * Set authentication cookies
 */
export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  csrfToken?: string
): void {
  const config = getCookieConfig();

  // Set access token (HTTP-only)
  res.cookie(config.accessTokenName, accessToken, getAccessTokenCookieOptions());

  // Set refresh token (HTTP-only, restricted path)
  res.cookie(config.refreshTokenName, refreshToken, getRefreshTokenCookieOptions());

  // Set CSRF token (readable by JavaScript for CSRF protection)
  if (csrfToken) {
    res.cookie(config.csrfTokenName, csrfToken, getCsrfTokenCookieOptions());
  }
}

/**
 * Clear authentication cookies
 */
export function clearAuthCookies(res: Response): void {
  const config = getCookieConfig();

  const clearOptions: CookieOptions = {
    httpOnly: true,
    secure: config.secure,
    sameSite: config.sameSite,
    path: config.path,
    domain: config.domain,
  };

  res.clearCookie(config.accessTokenName, clearOptions);
  res.clearCookie(config.refreshTokenName, { ...clearOptions, path: '/auth/refresh' });
  res.clearCookie(config.csrfTokenName, { ...clearOptions, httpOnly: false });
}

/**
 * Get access token from cookies
 */
export function getAccessTokenFromCookies(req: Request): string | null {
  const config = getCookieConfig();
  return req.cookies?.[config.accessTokenName] || null;
}

/**
 * Get refresh token from cookies
 */
export function getRefreshTokenFromCookies(req: Request): string | null {
  const config = getCookieConfig();
  return req.cookies?.[config.refreshTokenName] || null;
}

/**
 * Generate CSRF token
 */
export function generateCsrfToken(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify CSRF token
 */
export function verifyCsrfToken(req: Request): boolean {
  const config = getCookieConfig();

  // Get CSRF token from cookie
  const cookieToken = req.cookies?.[config.csrfTokenName];

  // Get CSRF token from header
  const headerToken = req.headers['x-csrf-token'] as string;

  if (!cookieToken || !headerToken) {
    return false;
  }

  // Use timing-safe comparison
  const crypto = require('crypto');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(headerToken)
    );
  } catch {
    return false;
  }
}

/**
 * CSRF protection middleware
 */
export function csrfProtection(req: Request, res: Response, next: Function): void {
  // Skip CSRF check for safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    next();
    return;
  }

  // Skip CSRF check for service-to-service requests
  if (req.headers['x-service-token']) {
    next();
    return;
  }

  // Verify CSRF token
  if (!verifyCsrfToken(req)) {
    res.status(403).json({
      error: 'CSRF token validation failed',
      message: 'Please refresh the page and try again',
    });
    return;
  }

  next();
}

/**
 * Cookie-based authentication middleware
 * This middleware extracts the token from cookies instead of Authorization header
 */
export function cookieAuthMiddleware(req: Request, res: Response, next: Function): void {
  // First try Authorization header (for API clients)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Token provided in header, proceed with standard auth
    next();
    return;
  }

  // Then try cookie
  const accessToken = getAccessTokenFromCookies(req);
  if (accessToken) {
    // Set the Authorization header from the cookie
    // This allows existing auth middleware to work unchanged
    req.headers.authorization = `Bearer ${accessToken}`;
  }

  next();
}

/**
 * Response helper for setting auth cookies on login
 */
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
  };
  csrfToken: string;
}

export function sendAuthResponse(
  res: Response,
  accessToken: string,
  refreshToken: string,
  user: AuthResponse['user']
): void {
  const csrfToken = generateCsrfToken();

  // Set HTTP-only cookies
  setAuthCookies(res, accessToken, refreshToken, csrfToken);

  // Return user info and CSRF token (but NOT the access/refresh tokens)
  res.json({
    success: true,
    user,
    csrfToken, // Frontend needs this for subsequent requests
    expiresIn: TOKEN_EXPIRY.ACCESS_TOKEN / 1000, // in seconds
  });
}

/**
 * Response helper for token refresh
 */
export function sendRefreshResponse(
  res: Response,
  accessToken: string,
  refreshToken: string
): void {
  const csrfToken = generateCsrfToken();

  // Set new cookies
  setAuthCookies(res, accessToken, refreshToken, csrfToken);

  res.json({
    success: true,
    csrfToken,
    expiresIn: TOKEN_EXPIRY.ACCESS_TOKEN / 1000,
  });
}

/**
 * Response helper for logout
 */
export function sendLogoutResponse(res: Response): void {
  clearAuthCookies(res);

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
}
