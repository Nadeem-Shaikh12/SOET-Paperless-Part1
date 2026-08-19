import { Request, Response, NextFunction } from 'express';
import logger from '../lib/logger.js';

export interface AppError {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
}

/**
 * Custom error class for application errors with status codes.
 */
export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(statusCode: number, code: string, message: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'ApiError';
  }

  static badRequest(message: string, details?: any) {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string, details?: any) {
    return new ApiError(409, 'CONFLICT', message, details);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  }
}

/**
 * Centralized error handler middleware.
 * Returns consistent JSON error shape: { error: { code, message, details? } }
 * No stack traces exposed in production.
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
    return;
  }

  // Log unexpected errors
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    },
  });
}
