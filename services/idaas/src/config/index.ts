/**
 * NEXUS IDaaS - Configuration Management
 */

import dotenv from 'dotenv';
import { PasswordPolicy } from '../types';

// Load environment variables
dotenv.config();

interface Config {
  // Server
  port: number;
  nodeEnv: string;
  apiVersion: string;

  // App
  app: {
    url: string;
  };

  // Database
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    maxConnections: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
  };

  // Redis
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    keyPrefix: string;
  };

  // JWT
  jwt: {
    secret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
    algorithm: string;
  };

  // Security
  security: {
    bcryptRounds: number;
    maxLoginAttempts: number;
    lockoutDuration: number; // minutes
    sessionTimeout: number; // minutes
    passwordPolicy: PasswordPolicy;
  };

  // MFA
  mfa: {
    issuer: string;
    window: number; // Number of time steps to check
    codeLength: number;
    backupCodesCount: number;
  };

  // CORS
  cors: {
    origin: string | string[];
    credentials: boolean;
  };

  // Rate Limiting
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };

  // Email
  email: {
    enabled: boolean;
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    password?: string;
    from?: string;
  };

  // SMS (for MFA)
  sms: {
    enabled: boolean;
    provider?: string;
    twilioAccountSid?: string;
    twilioAuthToken?: string;
    twilioPhoneNumber?: string;
  };

  // OAuth Providers (default configs)
  oauth: {
    google: {
      enabled: boolean;
      clientId?: string;
      clientSecret?: string;
      callbackURL?: string;
    };
    microsoft: {
      enabled: boolean;
      clientId?: string;
      clientSecret?: string;
      callbackURL?: string;
    };
    github: {
      enabled: boolean;
      clientId?: string;
      clientSecret?: string;
      callbackURL?: string;
    };
  };

  // Monitoring
  monitoring: {
    enabled: boolean;
    metricsPort: number;
  };

  // Logging
  logging: {
    level: string;
    format: string;
  };
}

export const config: Config = {
  // Server
  port: parseInt(process.env.PORT || '8100', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiVersion: 'v1',

  // App
  app: {
    url: process.env.APP_URL || 'http://localhost:3000',
  },

  // Database
  database: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'idaas',
    user: process.env.POSTGRES_USER || 'nexus',
    password: process.env.POSTGRES_PASSWORD || 'nexus',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    keyPrefix: 'idaas:',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    accessTokenExpiry: process.env.JWT_EXPIRES_IN || '15m',
    refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    algorithm: 'HS256',
  },

  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '30', 10),
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '60', 10),
    passwordPolicy: {
      minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
      requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
      requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
      requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
      requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL !== 'false',
      maxAge: parseInt(process.env.PASSWORD_MAX_AGE || '90', 10),
      preventReuse: parseInt(process.env.PASSWORD_PREVENT_REUSE || '5', 10),
    },
  },

  // MFA
  mfa: {
    issuer: process.env.MFA_ISSUER || 'NEXUS',
    window: parseInt(process.env.MFA_WINDOW || '2', 10),
    codeLength: parseInt(process.env.MFA_CODE_LENGTH || '6', 10),
    backupCodesCount: parseInt(process.env.MFA_BACKUP_CODES || '10', 10),
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  // Email
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM || 'noreply@nexus.platform',
  },

  // SMS
  sms: {
    enabled: process.env.SMS_ENABLED === 'true',
    provider: process.env.SMS_PROVIDER || 'twilio',
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
    twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },

  // OAuth
  oauth: {
    google: {
      enabled: process.env.GOOGLE_OAUTH_ENABLED === 'true',
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    microsoft: {
      enabled: process.env.MICROSOFT_OAUTH_ENABLED === 'true',
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      callbackURL: process.env.MICROSOFT_CALLBACK_URL,
    },
    github: {
      enabled: process.env.GITHUB_OAUTH_ENABLED === 'true',
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
    },
  },

  // Monitoring
  monitoring: {
    enabled: process.env.MONITORING_ENABLED !== 'false',
    metricsPort: parseInt(process.env.METRICS_PORT || '9090', 10),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
};

// Validate required configuration
export function validateConfig(): void {
  const errors: string[] = [];

  if (!config.jwt.secret || config.jwt.secret === 'your-secret-key-change-in-production') {
    if (config.nodeEnv === 'production') {
      errors.push('JWT_SECRET must be set in production');
    }
  }

  if (!config.database.password || config.database.password === 'nexus') {
    if (config.nodeEnv === 'production') {
      errors.push('POSTGRES_PASSWORD must be set in production');
    }
  }

  if (config.email.enabled && (!config.email.host || !config.email.user || !config.email.password)) {
    errors.push('Email configuration is incomplete');
  }

  if (config.sms.enabled && (!config.sms.twilioAccountSid || !config.sms.twilioAuthToken)) {
    errors.push('SMS configuration is incomplete');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

export default config;
