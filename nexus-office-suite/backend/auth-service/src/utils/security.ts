import crypto from 'crypto';

/**
 * Security Configuration Utility
 * Validates required environment variables and provides secure defaults
 */

// Required environment variables for security
const REQUIRED_SECURITY_VARS = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
] as const;

// Minimum length requirements for secrets
const MIN_SECRET_LENGTH = 32;

/**
 * Validates that all required security environment variables are set
 * and meet minimum security requirements.
 * Should be called on application startup.
 */
export function validateSecurityConfig(): void {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const varName of REQUIRED_SECURITY_VARS) {
    const value = process.env[varName];

    if (!value) {
      errors.push(`Missing required environment variable: ${varName}`);
      continue;
    }

    // Check for placeholder values
    if (value.includes('change-this') || value.includes('your-super-secret') || value === 'changeme') {
      errors.push(`${varName} contains placeholder value. Please set a secure secret.`);
      continue;
    }

    // Check minimum length
    if (value.length < MIN_SECRET_LENGTH) {
      warnings.push(`${varName} should be at least ${MIN_SECRET_LENGTH} characters for security.`);
    }
  }

  // Database password check
  const dbPassword = process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD;
  if (dbPassword && (dbPassword === 'postgres' || dbPassword === 'password')) {
    if (process.env.NODE_ENV === 'production') {
      errors.push('Database password is using default value in production!');
    } else {
      warnings.push('Database password is using default value. Change before production.');
    }
  }

  // Log warnings
  if (warnings.length > 0) {
    console.warn('\n⚠️  Security Configuration Warnings:');
    warnings.forEach((w) => console.warn(`   - ${w}`));
    console.warn('');
  }

  // Throw error if critical issues found in production
  if (errors.length > 0) {
    console.error('\n🚫 Security Configuration Errors:');
    errors.forEach((e) => console.error(`   - ${e}`));
    console.error('');

    if (process.env.NODE_ENV === 'production') {
      throw new Error('Security configuration validation failed. Fix the above errors before running in production.');
    } else {
      console.warn('⚠️  Running with security issues in development mode. DO NOT deploy to production!\n');
    }
  }
}

/**
 * Gets the JWT secret with validation.
 * Throws an error in production if not properly configured.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required in production');
    }
    // Development fallback - log warning
    console.warn('⚠️  Using development JWT_SECRET. Set JWT_SECRET environment variable for production.');
    return 'dev-only-jwt-secret-do-not-use-in-production-' + crypto.randomBytes(16).toString('hex');
  }

  return secret;
}

/**
 * Gets the JWT refresh secret with validation.
 */
export function getJwtRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_REFRESH_SECRET is required in production');
    }
    console.warn('⚠️  Using development JWT_REFRESH_SECRET. Set JWT_REFRESH_SECRET environment variable for production.');
    return 'dev-only-refresh-secret-do-not-use-in-production-' + crypto.randomBytes(16).toString('hex');
  }

  return secret;
}

/**
 * Password validation rules for strong passwords
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'strong' | 'very-strong';
}

/**
 * Validates password strength with comprehensive rules
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // Minimum length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else if (password.length >= 12) {
    score += 1;
  }
  if (password.length >= 16) {
    score += 1;
  }

  // Uppercase letter check
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }

  // Lowercase letter check
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }

  // Number check
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 1;
  }

  // Special character check
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else {
    score += 1;
  }

  // Common patterns check
  const commonPatterns = [
    /^password/i,
    /^123456/,
    /^qwerty/i,
    /^admin/i,
    /(.)\1{3,}/, // 4+ repeated characters
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains a common pattern that is easy to guess');
      score = Math.max(0, score - 2);
      break;
    }
  }

  // Determine strength
  let strength: PasswordValidationResult['strength'];
  if (score <= 2) {
    strength = 'weak';
  } else if (score <= 4) {
    strength = 'fair';
  } else if (score <= 5) {
    strength = 'strong';
  } else {
    strength = 'very-strong';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
}

/**
 * Generates cryptographically secure backup codes for MFA
 */
export function generateSecureBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate 8 random bytes and convert to hex
    const bytes = crypto.randomBytes(4);
    // Format as XXXX-XXXX for readability
    const hex = bytes.toString('hex').toUpperCase();
    const code = `${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
    codes.push(code);
  }

  return codes;
}

/**
 * Generates a cryptographically secure random token
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
