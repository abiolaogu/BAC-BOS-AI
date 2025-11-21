/**
 * NEXUS IDaaS - Authentication Tests
 * Basic test suite for auth functionality
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { hashPassword, verifyPassword, validatePassword } from '../src/utils/crypto';
import { generateTokenPair, verifyToken } from '../src/utils/jwt';

describe('Authentication Utilities', () => {
  describe('Password Hashing', () => {
    it('should hash password correctly', async () => {
      const password = 'SecurePassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should verify correct password', async () => {
      const password = 'SecurePassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'SecurePassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });
  });

  describe('Password Validation', () => {
    it('should accept strong password', () => {
      const result = validatePassword('SecurePassword123!');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject weak password', () => {
      const result = validatePassword('weak');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should require minimum length', () => {
      const result = validatePassword('Short1!');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('8 characters'))).toBe(true);
    });
  });

  describe('JWT Tokens', () => {
    it('should generate token pair', () => {
      const payload = {
        userId: '123',
        email: 'test@example.com',
      };

      const tokens = generateTokenPair(payload);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBeGreaterThan(0);
    });

    it('should verify valid token', () => {
      const payload = {
        userId: '123',
        email: 'test@example.com',
      };

      const tokens = generateTokenPair(payload);
      const decoded = verifyToken(tokens.accessToken);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
    });

    it('should reject invalid token', () => {
      expect(() => {
        verifyToken('invalid.token.here');
      }).toThrow();
    });
  });
});
