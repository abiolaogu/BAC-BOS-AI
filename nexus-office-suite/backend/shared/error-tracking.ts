/**
 * Centralized Error Tracking Module
 *
 * This module provides error tracking integration with Sentry
 * for monitoring application errors in production.
 *
 * Features:
 * - Automatic error capturing
 * - Request context enrichment
 * - User context tracking
 * - Performance monitoring
 * - Custom error classification
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Error tracking configuration
 */
export interface ErrorTrackingConfig {
  dsn?: string;
  environment: string;
  release?: string;
  serviceName: string;
  sampleRate?: number;
  tracesSampleRate?: number;
  debug?: boolean;
}

/**
 * User context for error tracking
 */
export interface UserContext {
  id: string;
  email?: string;
  username?: string;
  tenantId?: string;
  roles?: string[];
}

/**
 * Error severity levels
 */
export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

/**
 * Error tracking interface
 * Can be implemented by different providers (Sentry, DataDog, etc.)
 */
export interface ErrorTracker {
  init(config: ErrorTrackingConfig): void;
  captureException(error: Error, context?: Record<string, unknown>): string;
  captureMessage(message: string, severity?: ErrorSeverity): string;
  setUserContext(user: UserContext | null): void;
  setTag(key: string, value: string): void;
  setExtra(key: string, value: unknown): void;
  addBreadcrumb(message: string, category?: string, data?: Record<string, unknown>): void;
  startTransaction(name: string, op: string): Transaction;
  flush(timeout?: number): Promise<boolean>;
}

/**
 * Transaction interface for performance monitoring
 */
export interface Transaction {
  setStatus(status: 'ok' | 'error' | 'cancelled'): void;
  finish(): void;
  startChild(op: string, description?: string): Span;
}

export interface Span {
  setStatus(status: 'ok' | 'error' | 'cancelled'): void;
  finish(): void;
}

/**
 * Sentry-based error tracker implementation
 */
class SentryErrorTracker implements ErrorTracker {
  private initialized = false;
  private config: ErrorTrackingConfig | null = null;

  init(config: ErrorTrackingConfig): void {
    this.config = config;

    // Check if DSN is provided
    if (!config.dsn) {
      console.warn('⚠️  Error tracking DSN not configured. Error tracking is disabled.');
      console.warn('   Set SENTRY_DSN environment variable to enable error tracking.');
      return;
    }

    try {
      // Dynamic import of Sentry to avoid bundling if not used
      const Sentry = require('@sentry/node');

      Sentry.init({
        dsn: config.dsn,
        environment: config.environment,
        release: config.release,
        sampleRate: config.sampleRate ?? 1.0,
        tracesSampleRate: config.tracesSampleRate ?? 0.1,
        debug: config.debug ?? false,
        serverName: config.serviceName,
        integrations: [
          // Enable HTTP tracing
          new Sentry.Integrations.Http({ tracing: true }),
        ],
        beforeSend(event: any, hint: any) {
          // Filter out sensitive data
          if (event.request) {
            // Remove sensitive headers
            const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
            if (event.request.headers) {
              sensitiveHeaders.forEach(header => {
                if (event.request.headers[header]) {
                  event.request.headers[header] = '[FILTERED]';
                }
              });
            }

            // Remove sensitive body fields
            if (event.request.data) {
              const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
              sensitiveFields.forEach(field => {
                if (event.request.data[field]) {
                  event.request.data[field] = '[FILTERED]';
                }
              });
            }
          }

          return event;
        },
      });

      this.initialized = true;
      console.log(`✅ Error tracking initialized for ${config.serviceName} (${config.environment})`);
    } catch (error) {
      console.error('Failed to initialize error tracking:', error);
    }
  }

  captureException(error: Error, context?: Record<string, unknown>): string {
    if (!this.initialized) {
      console.error('Error (tracking disabled):', error.message);
      return 'error-tracking-disabled';
    }

    const Sentry = require('@sentry/node');

    return Sentry.captureException(error, {
      extra: context,
    });
  }

  captureMessage(message: string, severity: ErrorSeverity = 'info'): string {
    if (!this.initialized) {
      console.log(`Message (${severity}):`, message);
      return 'error-tracking-disabled';
    }

    const Sentry = require('@sentry/node');

    return Sentry.captureMessage(message, severity);
  }

  setUserContext(user: UserContext | null): void {
    if (!this.initialized) return;

    const Sentry = require('@sentry/node');

    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.username,
      });
      Sentry.setTag('tenantId', user.tenantId || 'unknown');
    } else {
      Sentry.setUser(null);
    }
  }

  setTag(key: string, value: string): void {
    if (!this.initialized) return;

    const Sentry = require('@sentry/node');
    Sentry.setTag(key, value);
  }

  setExtra(key: string, value: unknown): void {
    if (!this.initialized) return;

    const Sentry = require('@sentry/node');
    Sentry.setExtra(key, value);
  }

  addBreadcrumb(message: string, category: string = 'default', data?: Record<string, unknown>): void {
    if (!this.initialized) return;

    const Sentry = require('@sentry/node');

    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: 'info',
    });
  }

  startTransaction(name: string, op: string): Transaction {
    if (!this.initialized) {
      return {
        setStatus: () => {},
        finish: () => {},
        startChild: () => ({
          setStatus: () => {},
          finish: () => {},
        }),
      };
    }

    const Sentry = require('@sentry/node');
    const transaction = Sentry.startTransaction({ name, op });

    return {
      setStatus: (status: string) => transaction.setStatus(status),
      finish: () => transaction.finish(),
      startChild: (childOp: string, description?: string) => {
        const span = transaction.startChild({ op: childOp, description });
        return {
          setStatus: (status: string) => span.setStatus(status),
          finish: () => span.finish(),
        };
      },
    };
  }

  async flush(timeout: number = 2000): Promise<boolean> {
    if (!this.initialized) return true;

    const Sentry = require('@sentry/node');
    return Sentry.flush(timeout);
  }
}

/**
 * Console-based error tracker for development
 */
class ConsoleErrorTracker implements ErrorTracker {
  private serviceName = 'unknown';

  init(config: ErrorTrackingConfig): void {
    this.serviceName = config.serviceName;
    console.log(`📝 Console error tracking enabled for ${config.serviceName}`);
  }

  captureException(error: Error, context?: Record<string, unknown>): string {
    console.error(`[${this.serviceName}] Error:`, error.message);
    if (context) {
      console.error('Context:', JSON.stringify(context, null, 2));
    }
    console.error('Stack:', error.stack);
    return `console-${Date.now()}`;
  }

  captureMessage(message: string, severity: ErrorSeverity = 'info'): string {
    console.log(`[${this.serviceName}] ${severity.toUpperCase()}: ${message}`);
    return `console-${Date.now()}`;
  }

  setUserContext(user: UserContext | null): void {
    if (user) {
      console.log(`[${this.serviceName}] User context:`, user.id);
    }
  }

  setTag(key: string, value: string): void {
    // No-op for console tracker
  }

  setExtra(key: string, value: unknown): void {
    // No-op for console tracker
  }

  addBreadcrumb(message: string, category?: string, data?: Record<string, unknown>): void {
    console.log(`[${this.serviceName}] Breadcrumb [${category}]: ${message}`);
  }

  startTransaction(name: string, op: string): Transaction {
    const start = Date.now();
    console.log(`[${this.serviceName}] Transaction started: ${name} (${op})`);

    return {
      setStatus: () => {},
      finish: () => {
        console.log(`[${this.serviceName}] Transaction finished: ${name} (${Date.now() - start}ms)`);
      },
      startChild: (childOp: string) => ({
        setStatus: () => {},
        finish: () => {},
      }),
    };
  }

  async flush(): Promise<boolean> {
    return true;
  }
}

/**
 * Global error tracker instance
 */
let errorTracker: ErrorTracker;

/**
 * Initialize error tracking
 */
export function initErrorTracking(config: ErrorTrackingConfig): ErrorTracker {
  // Use Sentry in production, console in development
  if (config.dsn && config.environment === 'production') {
    errorTracker = new SentryErrorTracker();
  } else {
    errorTracker = new ConsoleErrorTracker();
  }

  errorTracker.init(config);
  return errorTracker;
}

/**
 * Get the error tracker instance
 */
export function getErrorTracker(): ErrorTracker {
  if (!errorTracker) {
    // Initialize with default console tracker
    errorTracker = new ConsoleErrorTracker();
    errorTracker.init({
      environment: process.env.NODE_ENV || 'development',
      serviceName: 'unknown',
    });
  }
  return errorTracker;
}

/**
 * Express middleware for error tracking
 */
export function errorTrackingMiddleware(serviceName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Add request context
    const tracker = getErrorTracker();

    tracker.addBreadcrumb(`${req.method} ${req.path}`, 'http', {
      url: req.url,
      method: req.method,
      query: req.query,
    });

    // Set user context if available
    if ((req as any).user) {
      tracker.setUserContext({
        id: (req as any).user.userId,
        email: (req as any).user.email,
        tenantId: (req as any).user.tenantId,
        roles: (req as any).user.roles,
      });
    }

    // Track response
    const originalSend = res.send;
    res.send = function (body): Response {
      tracker.addBreadcrumb(`Response ${res.statusCode}`, 'http', {
        statusCode: res.statusCode,
      });
      return originalSend.call(this, body);
    };

    next();
  };
}

/**
 * Express error handler with tracking
 */
export function errorTrackingErrorHandler(serviceName: string) {
  return (error: Error, req: Request, res: Response, next: NextFunction): void => {
    const tracker = getErrorTracker();

    // Capture the error
    const eventId = tracker.captureException(error, {
      request: {
        method: req.method,
        url: req.url,
        query: req.query,
        headers: {
          'user-agent': req.headers['user-agent'],
          'content-type': req.headers['content-type'],
        },
      },
      user: (req as any).user,
    });

    // Add event ID to response
    res.setHeader('X-Error-ID', eventId);

    // Pass to next error handler
    next(error);
  };
}

/**
 * Wrap an async function with error tracking
 */
export function trackErrors<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  name?: string
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const tracker = getErrorTracker();
    const transaction = tracker.startTransaction(name || fn.name || 'anonymous', 'function');

    try {
      const result = await fn(...args);
      transaction.setStatus('ok');
      return result;
    } catch (error) {
      transaction.setStatus('error');
      tracker.captureException(error as Error);
      throw error;
    } finally {
      transaction.finish();
    }
  }) as T;
}

/**
 * Create error tracking configuration from environment variables
 */
export function createErrorTrackingConfig(serviceName: string): ErrorTrackingConfig {
  return {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.APP_VERSION || process.env.npm_package_version,
    serviceName,
    sampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE || '1.0'),
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    debug: process.env.SENTRY_DEBUG === 'true',
  };
}
