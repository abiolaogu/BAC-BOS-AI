/**
 * Test Mocks and Fixtures
 */

import { Request, Response } from 'express';

/**
 * Create a mock Express Request object
 */
export function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    get: jest.fn((header: string) => {
      const headers: Record<string, string> = overrides.headers as Record<string, string> || {};
      return headers[header.toLowerCase()];
    }),
    ip: '127.0.0.1',
    ...overrides,
  };
}

/**
 * Create a mock Express Response object
 */
export function createMockResponse(): Partial<Response> & {
  _status: number;
  _json: unknown;
  _headers: Record<string, string>;
} {
  const res: Partial<Response> & {
    _status: number;
    _json: unknown;
    _headers: Record<string, string>;
  } = {
    _status: 200,
    _json: null,
    _headers: {},
    status: jest.fn(function(this: typeof res, code: number) {
      this._status = code;
      return this as Response;
    }),
    json: jest.fn(function(this: typeof res, data: unknown) {
      this._json = data;
      return this as Response;
    }),
    send: jest.fn(function(this: typeof res, data: unknown) {
      this._json = data;
      return this as Response;
    }),
    setHeader: jest.fn(function(this: typeof res, name: string, value: string) {
      this._headers[name] = value;
      return this as Response;
    }),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  };
  return res;
}

/**
 * Create a mock next function
 */
export function createMockNext(): jest.Mock {
  return jest.fn();
}

/**
 * Test User Fixtures
 */
export const testUsers = {
  validUser: {
    id: 'user-123',
    email: 'test@example.com',
    password_hash: '$2b$10$abcdefghijklmnopqrstuv', // bcrypt hash
    first_name: 'Test',
    last_name: 'User',
    tenant_id: 'tenant-456',
    roles: ['user'],
    mfa_enabled: false,
    mfa_secret: null,
    email_verified: true,
    created_at: new Date(),
    updated_at: new Date(),
  },
  adminUser: {
    id: 'admin-789',
    email: 'admin@example.com',
    password_hash: '$2b$10$abcdefghijklmnopqrstuv',
    first_name: 'Admin',
    last_name: 'User',
    tenant_id: 'tenant-456',
    roles: ['admin', 'user'],
    mfa_enabled: true,
    mfa_secret: 'ABCDEFGHIJKLMNOP',
    email_verified: true,
    created_at: new Date(),
    updated_at: new Date(),
  },
  unverifiedUser: {
    id: 'unverified-101',
    email: 'unverified@example.com',
    password_hash: '$2b$10$abcdefghijklmnopqrstuv',
    first_name: 'Unverified',
    last_name: 'User',
    tenant_id: 'tenant-456',
    roles: ['user'],
    mfa_enabled: false,
    mfa_secret: null,
    email_verified: false,
    created_at: new Date(),
    updated_at: new Date(),
  },
};

/**
 * Test Session Fixtures
 */
export const testSessions = {
  validSession: {
    id: 'session-123',
    user_id: 'user-123',
    refresh_token: 'valid-refresh-token',
    device_info: 'Mozilla/5.0',
    ip_address: '127.0.0.1',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    created_at: new Date(),
  },
  expiredSession: {
    id: 'session-456',
    user_id: 'user-123',
    refresh_token: 'expired-refresh-token',
    device_info: 'Mozilla/5.0',
    ip_address: '127.0.0.1',
    expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    created_at: new Date(),
  },
};

/**
 * Mock Database Pool
 */
export function createMockPool() {
  return {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  };
}

/**
 * Mock User Model
 */
export function createMockUserModel() {
  return {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updatePassword: jest.fn(),
    updateMFA: jest.fn(),
    verifyEmail: jest.fn(),
  };
}

/**
 * Mock Session Model
 */
export function createMockSessionModel() {
  return {
    create: jest.fn(),
    findByRefreshToken: jest.fn(),
    deleteByRefreshToken: jest.fn(),
    deleteAllByUserId: jest.fn(),
    deleteExpired: jest.fn(),
  };
}

/**
 * Mock Email Service
 */
export function createMockEmailService() {
  return {
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendLoginNotification: jest.fn().mockResolvedValue(undefined),
  };
}
