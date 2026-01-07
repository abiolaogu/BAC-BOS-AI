import crypto from 'crypto';

/**
 * Security Configuration Utility for API Gateway
 */

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

  // Check for placeholder values
  if (secret.includes('change-this') || secret.includes('your-super-secret')) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET contains placeholder value. Please set a secure secret.');
    }
    console.warn('⚠️  JWT_SECRET contains placeholder value. Change before production.');
  }

  return secret;
}

/**
 * Validates security configuration at startup
 */
export function validateSecurityConfig(): void {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check JWT secret
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    if (process.env.NODE_ENV === 'production') {
      errors.push('JWT_SECRET is required');
    } else {
      warnings.push('JWT_SECRET not set. Using development fallback.');
    }
  } else if (jwtSecret.includes('change-this') || jwtSecret.includes('your-super-secret')) {
    warnings.push('JWT_SECRET contains placeholder value. Change before production.');
  }

  // Log warnings
  if (warnings.length > 0) {
    console.warn('\n⚠️  Security Warnings:');
    warnings.forEach((w) => console.warn(`   - ${w}`));
  }

  // Handle errors
  if (errors.length > 0) {
    console.error('\n🚫 Security Errors:');
    errors.forEach((e) => console.error(`   - ${e}`));
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Security configuration validation failed');
    }
  }
}
