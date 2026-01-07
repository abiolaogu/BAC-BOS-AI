/**
 * Security Utilities Unit Tests
 */

import {
  validatePassword,
  generateSecureBackupCodes,
  generateSecureToken,
  secureCompare,
  getJwtSecret,
  getJwtRefreshSecret,
  validateSecurityConfig,
} from '../../src/utils/security';

describe('Security Utilities', () => {
  describe('validatePassword', () => {
    it('should accept a strong password', () => {
      const result = validatePassword('SecurePass123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(['strong', 'very-strong']).toContain(result.strength);
    });

    it('should reject a password that is too short', () => {
      const result = validatePassword('Abc1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject a password without uppercase letters', () => {
      const result = validatePassword('lowercase123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject a password without lowercase letters', () => {
      const result = validatePassword('UPPERCASE123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject a password without numbers', () => {
      const result = validatePassword('NoNumbers!abc');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject a password without special characters', () => {
      const result = validatePassword('NoSpecial123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject common password patterns', () => {
      const result = validatePassword('password123!A');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password contains a common pattern that is easy to guess');
    });

    it('should detect weak passwords', () => {
      const result = validatePassword('weak');
      expect(result.strength).toBe('weak');
    });

    it('should classify very strong passwords correctly', () => {
      const result = validatePassword('MyVeryStr0ng&SecureP@ssword!');
      expect(result.isValid).toBe(true);
      expect(result.strength).toBe('very-strong');
    });
  });

  describe('generateSecureBackupCodes', () => {
    it('should generate the specified number of codes', () => {
      const codes = generateSecureBackupCodes(10);
      expect(codes).toHaveLength(10);
    });

    it('should generate codes in XXXX-XXXX format', () => {
      const codes = generateSecureBackupCodes(5);
      codes.forEach(code => {
        expect(code).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/);
      });
    });

    it('should generate unique codes', () => {
      const codes = generateSecureBackupCodes(100);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(100);
    });

    it('should default to 10 codes when no count specified', () => {
      const codes = generateSecureBackupCodes();
      expect(codes).toHaveLength(10);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate a hex token of the correct length', () => {
      const token = generateSecureToken(32);
      expect(token).toHaveLength(64); // 32 bytes = 64 hex characters
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSecureToken(16));
      }
      expect(tokens.size).toBe(100);
    });

    it('should default to 32 bytes when no length specified', () => {
      const token = generateSecureToken();
      expect(token).toHaveLength(64);
    });

    it('should only contain hex characters', () => {
      const token = generateSecureToken(32);
      expect(token).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('secureCompare', () => {
    it('should return true for identical strings', () => {
      expect(secureCompare('test', 'test')).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(secureCompare('test', 'Test')).toBe(false);
    });

    it('should return false for strings of different lengths', () => {
      expect(secureCompare('short', 'longer string')).toBe(false);
    });

    it('should return true for empty strings', () => {
      expect(secureCompare('', '')).toBe(true);
    });
  });

  describe('getJwtSecret', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return JWT_SECRET from environment', () => {
      process.env.JWT_SECRET = 'my-secure-jwt-secret-for-testing-purposes';
      const secret = getJwtSecret();
      expect(secret).toBe('my-secure-jwt-secret-for-testing-purposes');
    });

    it('should warn about placeholder values in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'your-super-secret-jwt-key';
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      getJwtSecret();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getJwtRefreshSecret', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return JWT_REFRESH_SECRET from environment', () => {
      process.env.JWT_REFRESH_SECRET = 'my-refresh-secret-for-testing-purposes';
      const secret = getJwtRefreshSecret();
      expect(secret).toBe('my-refresh-secret-for-testing-purposes');
    });
  });

  describe('validateSecurityConfig', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should not throw in development with valid config', () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests-only-min-32-chars';
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-unit-tests-only-min-32';

      expect(() => validateSecurityConfig()).not.toThrow();
    });

    it('should warn about missing secrets in development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.JWT_SECRET;
      delete process.env.JWT_REFRESH_SECRET;

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      validateSecurityConfig();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
