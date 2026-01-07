/**
 * HTTPS/TLS Configuration for Services
 *
 * This module provides utilities for configuring HTTPS and mTLS
 * for secure service communication.
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import tls from 'tls';
import { Express } from 'express';

/**
 * TLS Configuration Options
 */
export interface TlsConfig {
  enabled: boolean;
  certPath?: string;
  keyPath?: string;
  caPath?: string;
  mutualTls?: boolean;
  minVersion?: tls.SecureVersion;
  ciphers?: string;
}

/**
 * Default secure TLS configuration
 */
const DEFAULT_TLS_CONFIG: Partial<TlsConfig> = {
  minVersion: 'TLSv1.2',
  // Modern cipher suite - disable weak ciphers
  ciphers: [
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-CHACHA20-POLY1305',
    'ECDHE-RSA-CHACHA20-POLY1305',
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256',
  ].join(':'),
};

/**
 * Load TLS configuration from environment variables
 */
export function loadTlsConfig(): TlsConfig {
  const enabled = process.env.TLS_ENABLED === 'true';

  if (!enabled) {
    return { enabled: false };
  }

  return {
    enabled: true,
    certPath: process.env.TLS_CERT_PATH,
    keyPath: process.env.TLS_KEY_PATH,
    caPath: process.env.TLS_CA_PATH,
    mutualTls: process.env.MTLS_ENABLED === 'true',
    minVersion: (process.env.TLS_MIN_VERSION as tls.SecureVersion) || DEFAULT_TLS_CONFIG.minVersion,
    ciphers: process.env.TLS_CIPHERS || DEFAULT_TLS_CONFIG.ciphers,
  };
}

/**
 * Validate TLS configuration
 */
export function validateTlsConfig(config: TlsConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.enabled) {
    return { valid: true, errors: [] };
  }

  if (!config.certPath) {
    errors.push('TLS_CERT_PATH is required when TLS is enabled');
  } else if (!fs.existsSync(config.certPath)) {
    errors.push(`Certificate file not found: ${config.certPath}`);
  }

  if (!config.keyPath) {
    errors.push('TLS_KEY_PATH is required when TLS is enabled');
  } else if (!fs.existsSync(config.keyPath)) {
    errors.push(`Key file not found: ${config.keyPath}`);
  }

  if (config.mutualTls) {
    if (!config.caPath) {
      errors.push('TLS_CA_PATH is required when mTLS is enabled');
    } else if (!fs.existsSync(config.caPath)) {
      errors.push(`CA certificate file not found: ${config.caPath}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Create HTTPS server options
 */
export function createHttpsOptions(config: TlsConfig): https.ServerOptions | null {
  if (!config.enabled) {
    return null;
  }

  const validation = validateTlsConfig(config);
  if (!validation.valid) {
    console.error('TLS configuration errors:', validation.errors);
    throw new Error('Invalid TLS configuration');
  }

  const options: https.ServerOptions = {
    cert: fs.readFileSync(config.certPath!),
    key: fs.readFileSync(config.keyPath!),
    minVersion: config.minVersion,
    ciphers: config.ciphers,
  };

  // Configure mutual TLS if enabled
  if (config.mutualTls && config.caPath) {
    options.ca = fs.readFileSync(config.caPath);
    options.requestCert = true;
    options.rejectUnauthorized = true;
  }

  return options;
}

/**
 * Create an HTTPS server for an Express app
 */
export function createSecureServer(
  app: Express,
  port: number,
  config?: TlsConfig
): { server: https.Server | null; isHttps: boolean } {
  const tlsConfig = config || loadTlsConfig();

  if (!tlsConfig.enabled) {
    console.log('⚠️  TLS is disabled. Running in HTTP mode.');
    console.log('   Set TLS_ENABLED=true and provide certificates for HTTPS.');
    return { server: null, isHttps: false };
  }

  const httpsOptions = createHttpsOptions(tlsConfig);
  if (!httpsOptions) {
    return { server: null, isHttps: false };
  }

  const server = https.createServer(httpsOptions, app);

  server.listen(port, () => {
    console.log(`🔒 HTTPS server running on port ${port}`);
    if (tlsConfig.mutualTls) {
      console.log('   Mutual TLS (mTLS) is enabled');
    }
  });

  return { server, isHttps: true };
}

/**
 * Create HTTPS agent for making secure requests to other services
 */
export function createSecureAgent(config?: TlsConfig): https.Agent {
  const tlsConfig = config || loadTlsConfig();

  const agentOptions: https.AgentOptions = {
    rejectUnauthorized: process.env.NODE_ENV === 'production',
    minVersion: tlsConfig.minVersion || 'TLSv1.2',
  };

  // Add client certificate for mTLS
  if (tlsConfig.mutualTls) {
    if (tlsConfig.certPath) {
      agentOptions.cert = fs.readFileSync(tlsConfig.certPath);
    }
    if (tlsConfig.keyPath) {
      agentOptions.key = fs.readFileSync(tlsConfig.keyPath);
    }
    if (tlsConfig.caPath) {
      agentOptions.ca = fs.readFileSync(tlsConfig.caPath);
    }
  }

  return new https.Agent(agentOptions);
}

/**
 * Service URL builder with HTTPS support
 */
export interface ServiceEndpoint {
  host: string;
  port: number;
  protocol: 'http' | 'https';
}

const SERVICE_ENDPOINTS: Record<string, ServiceEndpoint> = {
  'auth-service': {
    host: process.env.AUTH_SERVICE_HOST || 'auth-service',
    port: parseInt(process.env.AUTH_SERVICE_PORT || '3001', 10),
    protocol: process.env.SERVICE_PROTOCOL as 'http' | 'https' || 'http',
  },
  'api-gateway': {
    host: process.env.API_GATEWAY_HOST || 'api-gateway',
    port: parseInt(process.env.API_GATEWAY_PORT || '8000', 10),
    protocol: process.env.SERVICE_PROTOCOL as 'http' | 'https' || 'http',
  },
  'crm-service': {
    host: process.env.CRM_SERVICE_HOST || 'crm-service',
    port: parseInt(process.env.CRM_SERVICE_PORT || '8081', 10),
    protocol: process.env.SERVICE_PROTOCOL as 'http' | 'https' || 'http',
  },
  'finance-service': {
    host: process.env.FINANCE_SERVICE_HOST || 'finance-service',
    port: parseInt(process.env.FINANCE_SERVICE_PORT || '8082', 10),
    protocol: process.env.SERVICE_PROTOCOL as 'http' | 'https' || 'http',
  },
  'notification-service': {
    host: process.env.NOTIFICATION_SERVICE_HOST || 'notification-service',
    port: parseInt(process.env.NOTIFICATION_SERVICE_PORT || '3007', 10),
    protocol: process.env.SERVICE_PROTOCOL as 'http' | 'https' || 'http',
  },
  'collaboration-service': {
    host: process.env.COLLABORATION_SERVICE_HOST || 'collaboration-service',
    port: parseInt(process.env.COLLABORATION_SERVICE_PORT || '3008', 10),
    protocol: process.env.SERVICE_PROTOCOL as 'http' | 'https' || 'http',
  },
};

/**
 * Get the URL for a service
 */
export function getServiceUrl(serviceId: string, path: string = ''): string {
  const endpoint = SERVICE_ENDPOINTS[serviceId];
  if (!endpoint) {
    throw new Error(`Unknown service: ${serviceId}`);
  }

  const basePath = path.startsWith('/') ? path : `/${path}`;
  return `${endpoint.protocol}://${endpoint.host}:${endpoint.port}${basePath}`;
}

/**
 * Register a custom service endpoint
 */
export function registerServiceEndpoint(serviceId: string, endpoint: ServiceEndpoint): void {
  SERVICE_ENDPOINTS[serviceId] = endpoint;
}

/**
 * Express middleware to enforce HTTPS in production
 */
export function enforceHttps(req: any, res: any, next: any): void {
  // Skip in development
  if (process.env.NODE_ENV !== 'production') {
    next();
    return;
  }

  // Check if already HTTPS
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    next();
    return;
  }

  // Redirect to HTTPS
  const httpsUrl = `https://${req.headers.host}${req.url}`;
  res.redirect(301, httpsUrl);
}
