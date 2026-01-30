/**
 * Express Middleware
 *
 * Single Responsibility: Each middleware handles one concern
 * - requestLogger: Logging
 * - errorHandler: Error formatting
 */

import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import type { OpenAIErrorResponse } from '../types/index.js';

/**
 * Request logging middleware
 * Logs timestamp, method, and path for each request
 */
export function requestLogger(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
}

/**
 * Error handling middleware
 * Formats errors in OpenAI-compatible format
 */
export const errorHandler: ErrorRequestHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('[Error]', error);

  const response: OpenAIErrorResponse = {
    error: {
      message: error.message || 'Internal server error',
      type: 'server_error',
      code: 'internal_error',
    },
  };

  res.status(500).json(response);
};

