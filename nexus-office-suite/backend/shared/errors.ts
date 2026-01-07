/**
 * Standardized Error Handling Utilities
 *
 * This module provides consistent error handling across all backend services.
 * Use these utilities to ensure uniform error responses and proper HTTP status codes.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Standard API Error Response Format
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
    path?: string;
    requestId?: string;
  };
}

/**
 * Standard API Success Response Format
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    timestamp: string;
  };
}

/**
 * Custom Application Error with HTTP status code
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Predefined error types for common scenarios
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

export class InternalError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR');
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

/**
 * Send a standardized error response
 */
export function sendError(
  res: Response,
  error: AppError | Error,
  requestId?: string
): void {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const code = error instanceof AppError ? error.code : 'INTERNAL_ERROR';
  const details = error instanceof AppError ? error.details : undefined;

  // Don't expose internal error details in production
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'An unexpected error occurred'
    : error.message;

  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };

  res.status(statusCode).json(response);
}

/**
 * Send a standardized success response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  meta?: { page?: number; limit?: number; total?: number }
): void {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    meta: meta ? { ...meta, timestamp: new Date().toISOString() } : undefined,
  };

  res.status(statusCode).json(response);
}

/**
 * Async handler wrapper to catch promise rejections
 * Prevents unhandled promise rejection crashes
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error handling middleware
 * Place this at the end of your middleware chain
 */
export function errorHandler(logger?: { error: (...args: unknown[]) => void }) {
  return (
    error: Error,
    req: Request,
    res: Response,
    _next: NextFunction
  ): void => {
    // Log the error
    if (logger) {
      logger.error('Request error', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
      });
    } else {
      console.error('Request error:', error);
    }

    // Get request ID if available
    const requestId = req.headers['x-request-id'] as string | undefined;

    // Send error response
    sendError(res, error, requestId);
  };
}

/**
 * 404 Not Found handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, new NotFoundError(`Route ${req.method} ${req.path}`));
}

/**
 * HTTP Status Code to Error Class mapping
 */
export function createErrorFromStatus(
  statusCode: number,
  message: string
): AppError {
  switch (statusCode) {
    case 400:
      return new ValidationError(message);
    case 401:
      return new AuthenticationError(message);
    case 403:
      return new AuthorizationError(message);
    case 404:
      return new NotFoundError(message);
    case 409:
      return new ConflictError(message);
    case 429:
      return new RateLimitError(message);
    case 503:
      return new ServiceUnavailableError(message);
    default:
      return new InternalError(message);
  }
}
