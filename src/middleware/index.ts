/**
 * Express Middleware
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, _res: Response, next: NextFunction) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
}

/**
 * Error handling middleware
 */
export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('[Error]', error);

  // OpenAI-style error response
  res.status(500).json({
    error: {
      message: error.message || 'Internal server error',
      type: 'server_error',
      code: 'internal_error',
    },
  });
}

/**
 * API key authentication middleware (optional)
 */
export function apiKeyAuth(expectedKey?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!expectedKey) {
      return next(); // No auth required
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (token !== expectedKey) {
      return res.status(401).json({
        error: {
          message: 'Invalid API key',
          type: 'authentication_error',
          code: 'invalid_api_key',
        },
      });
    }

    next();
  };
}

