/**
 * Express Middleware
 *
 * Single Responsibility: Each middleware handles one concern
 * - requestLogger: Logging
 * - requestTimeout: Request timeout handling
 * - metricsRecorder: Metrics collection
 * - cors: Cross-origin requests
 * - securityHeaders: Security headers
 * - requestId: Request ID tracking
 * - errorHandler: Error formatting
 */

import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import type { OpenAIErrorResponse } from '#types';
import { recordRequest } from '#services/metrics';

/** Default request timeout in milliseconds (2 minutes for LLM requests) */
const DEFAULT_TIMEOUT_MS = 120_000;

// =============================================================================
// HTTP Header Constants
// =============================================================================

/** Security headers */
const HEADER_CONTENT_TYPE_OPTIONS = 'X-Content-Type-Options';
const HEADER_FRAME_OPTIONS = 'X-Frame-Options';
const HEADER_XSS_PROTECTION = 'X-XSS-Protection';
const HEADER_REFERRER_POLICY = 'Referrer-Policy';

/** Request tracking */
const HEADER_REQUEST_ID = 'X-Request-ID';

/** CORS headers */
const HEADER_CORS_ORIGIN = 'Access-Control-Allow-Origin';
const HEADER_CORS_METHODS = 'Access-Control-Allow-Methods';
const HEADER_CORS_HEADERS = 'Access-Control-Allow-Headers';
const HEADER_CORS_MAX_AGE = 'Access-Control-Max-Age';

/** Header values */
const VALUE_NOSNIFF = 'nosniff';
const VALUE_DENY = 'DENY';
const VALUE_XSS_BLOCK = '1; mode=block';
const VALUE_REFERRER_STRICT = 'strict-origin-when-cross-origin';
const VALUE_CORS_ALL_ORIGINS = '*';
const VALUE_CORS_METHODS = 'GET, POST, OPTIONS';
const VALUE_CORS_HEADERS = 'Content-Type, Authorization';
const VALUE_CORS_MAX_AGE = '86400'; // 24 hours

/**
 * Request logging middleware
 * Logs timestamp, method, and path for each request
 */
export const requestLogger = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
};

/**
 * Metrics recording middleware
 * Records request counts by endpoint and status code
 */
export const metricsRecorder = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.on('finish', () => {
    const routePath = (req.route as { path?: string } | undefined)?.path ?? req.path;
    const endpoint = `${req.method} ${routePath}`;
    recordRequest(endpoint, res.statusCode);
  });
  next();
};

/**
 * Request timeout middleware
 * Aborts requests that exceed the timeout limit
 */
export const requestTimeout = (timeoutMs: number = DEFAULT_TIMEOUT_MS) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip timeout for streaming requests (they handle their own lifecycle)
    const body = req.body as { stream?: boolean } | undefined;
    if (body?.stream === true) {
      next();
      return;
    }

    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        const response: OpenAIErrorResponse = {
          error: {
            message: 'Request timeout',
            type: 'timeout_error',
            code: 'request_timeout',
          },
        };
        res.status(504).json(response);
      }
    }, timeoutMs);

    // Clear timeout when response finishes
    res.on('finish', () => {
      clearTimeout(timeoutId);
    });
    res.on('close', () => {
      clearTimeout(timeoutId);
    });

    next();
  };
};

/**
 * CORS middleware
 * Allows cross-origin requests from browser clients
 */
export const cors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Allow all origins (configure via env if needed)
  res.setHeader(HEADER_CORS_ORIGIN, VALUE_CORS_ALL_ORIGINS);
  res.setHeader(HEADER_CORS_METHODS, VALUE_CORS_METHODS);
  res.setHeader(HEADER_CORS_HEADERS, VALUE_CORS_HEADERS);
  res.setHeader(HEADER_CORS_MAX_AGE, VALUE_CORS_MAX_AGE);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
};

/**
 * Security headers middleware
 * Adds common security headers to all responses
 */
export const securityHeaders = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Prevent MIME type sniffing
  res.setHeader(HEADER_CONTENT_TYPE_OPTIONS, VALUE_NOSNIFF);
  // Prevent clickjacking
  res.setHeader(HEADER_FRAME_OPTIONS, VALUE_DENY);
  // XSS protection (legacy, but still useful for older browsers)
  res.setHeader(HEADER_XSS_PROTECTION, VALUE_XSS_BLOCK);
  // Referrer policy
  res.setHeader(HEADER_REFERRER_POLICY, VALUE_REFERRER_STRICT);

  next();
};

/**
 * Request ID middleware
 * Adds a unique request ID to each request for tracing/debugging
 * Uses existing X-Request-ID header if provided, otherwise generates one
 */
export const requestId = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const existingId = req.headers[HEADER_REQUEST_ID.toLowerCase()];
  const id = typeof existingId === 'string' && existingId !== '' ? existingId : randomUUID();
  res.setHeader(HEADER_REQUEST_ID, id);
  next();
};

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

