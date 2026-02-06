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
 * - rateLimiter: Rate limiting
 * - apiKeyAuth: API key authentication
 * - errorHandler: Error formatting
 */

import { randomUUID, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import type { OpenAIErrorResponse } from '#types';
import { recordRequest, recordLatency } from '#services/metrics';
import { logger } from '#services/logger';

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
 * Normalize a path for metrics to prevent high-cardinality issues.
 * Replaces dynamic segments (UUIDs, numbers) with placeholders.
 */
const normalizePath = (path: string): string => {
  const normalized = path
    // Replace UUIDs (8-4-4-4-12 format)
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    // Replace numeric IDs
    .replace(/\/\d+/g, '/:id');

  // If no transformation occurred and path is empty or just slashes, use fallback
  return normalized && normalized !== '/' ? normalized : '/:unmatched';
};

/**
 * Derive a normalized endpoint string from a request.
 * Uses route path if available (matched routes), otherwise normalizes the raw path.
 * Shared helper to avoid duplication between requestLogger and metricsRecorder.
 */
const deriveEndpoint = (req: Request): string => {
  const routePath = (req.route as { path?: string } | undefined)?.path;
  const normalizedPath = routePath ?? normalizePath(req.path);
  return `${req.method} ${normalizedPath}`;
};

/**
 * Request logging middleware
 * Logs method, path, and response time using structured logging
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  const requestId = res.getHeader(HEADER_REQUEST_ID) as string | undefined;

  // Log request start
  logger.info({ requestId, method: req.method, path: req.path }, 'Request started');

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    logger[level](
      {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
      },
      'Request completed'
    );
    // Record latency for metrics using shared helper
    const endpoint = deriveEndpoint(req);
    recordLatency(endpoint, duration);
  });

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
    const endpoint = deriveEndpoint(req);
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
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = res.getHeader(HEADER_REQUEST_ID) as string | undefined;
  logger.error({ requestId, err: error, path: req.path }, 'Request error');

  const response: OpenAIErrorResponse = {
    error: {
      message: error.message || 'Internal server error',
      type: 'server_error',
      code: 'internal_error',
    },
  };

  res.status(500).json(response);
};

// =============================================================================
// Rate Limiting
// =============================================================================

/** Rate limit configuration */
interface RateLimitConfig {
  /** Maximum requests per window */
  readonly maxRequests: number;
  /** Window size in milliseconds */
  readonly windowMs: number;
}

/** Rate limit entry for tracking requests */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/** In-memory rate limit store (use Redis for horizontal scaling) */
const rateLimitStore = new Map<string, RateLimitEntry>();

/** Default rate limit: 100 requests per minute */
const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60_000,
};

/** Clean up expired entries periodically */
const cleanupRateLimitStore = (): void => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime <= now) {
      rateLimitStore.delete(key);
    }
  }
};

// Run cleanup every minute (unref to allow graceful shutdown)
const rateLimitCleanupInterval = setInterval(cleanupRateLimitStore, 60_000);
rateLimitCleanupInterval.unref();

/**
 * Hash a string using SHA-256 and return first 16 hex characters
 */
const hashKey = (key: string): string =>
  createHash('sha256').update(key).digest('hex').slice(0, 16);

/**
 * Extract client identifier for rate limiting
 * Uses API key hash if present, otherwise falls back to IP
 * Uses req.ip which respects Express trust proxy settings
 */
const getClientId = (req: Request): string => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ') === true) {
    // Use a hash of the API key to avoid storing/logging keys
    const key = authHeader.slice(7);
    return `key:sha256:${hashKey(key)}`;
  }
  // Fall back to IP address (Express handles X-Forwarded-For via trust proxy)
  return `ip:${req.ip ?? 'unknown'}`;
};

/**
 * Rate limiting middleware
 * Implements fixed-window rate limiting per client
 * Counters reset when the window expires
 */
export const rateLimiter = (config: RateLimitConfig = DEFAULT_RATE_LIMIT) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = getClientId(req);
    const now = Date.now();

    let entry = rateLimitStore.get(clientId);

    // Create new entry or reset if window expired
    if (!entry || entry.resetTime <= now) {
      entry = { count: 0, resetTime: now + config.windowMs };
      rateLimitStore.set(clientId, entry);
    }

    entry.count++;

    // Set rate limit headers
    const remaining = Math.max(0, config.maxRequests - entry.count);
    const resetSeconds = Math.ceil((entry.resetTime - now) / 1000);
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    // Check if rate limit exceeded
    if (entry.count > config.maxRequests) {
      const requestId = res.getHeader(HEADER_REQUEST_ID) as string | undefined;
      logger.warn({ requestId, clientId }, 'Rate limit exceeded');

      // Set Retry-After header for clients/proxies to honor backoff
      res.setHeader('Retry-After', String(resetSeconds));

      const response: OpenAIErrorResponse = {
        error: {
          message: 'Rate limit exceeded. Please retry after ' + String(resetSeconds) + ' seconds.',
          type: 'rate_limit_error',
          code: 'rate_limit_exceeded',
        },
      };
      res.status(429).json(response);
      return;
    }

    next();
  };
};

// =============================================================================
// API Key Authentication
// =============================================================================

/** Cached API keys to avoid reparsing on every request */
let cachedApiKeys: Set<string> | undefined;
let cachedApiKeysRaw: string | undefined;

/** API keys configuration (loaded from environment, cached) */
const getApiKeys = (): Set<string> => {
  const keys = process.env.API_KEYS;
  // Return cached Set if env hasn't changed
  if (keys === cachedApiKeysRaw && cachedApiKeys !== undefined) {
    return cachedApiKeys;
  }
  // Update cache
  cachedApiKeysRaw = keys;
  if (keys === undefined || keys === '') {
    cachedApiKeys = new Set();
  } else {
    cachedApiKeys = new Set(keys.split(',').map((k) => k.trim()).filter(Boolean));
  }
  return cachedApiKeys;
};

// Random key generated once at module load for HMAC-based comparison
// This ensures timing-safe comparison without length-dependent branches
const hmacKey = randomBytes(32);

/**
 * Constant-time comparison of two strings using HMAC.
 * Creates fixed-length digests to prevent timing attacks from length differences.
 */
const timingSafeCompare = (a: string, b: string): boolean => {
  // HMAC produces fixed-length output regardless of input length
  const hmacA = createHmac('sha256', hmacKey).update(a).digest();
  const hmacB = createHmac('sha256', hmacKey).update(b).digest();
  return timingSafeEqual(hmacA, hmacB);
};

/**
 * Check if a token matches any of the configured API keys using constant-time comparison.
 * Iterates through all keys to prevent timing attacks.
 */
const isValidApiKey = (token: string, apiKeys: Set<string>): boolean => {
  let isValid = false;
  // Always iterate through all keys to prevent timing attacks
  for (const key of apiKeys) {
    if (timingSafeCompare(token, key)) {
      isValid = true;
      // Don't return early - continue checking all keys for constant time
    }
  }
  return isValid;
};

/**
 * API key authentication middleware
 * Validates Bearer token against configured API keys using constant-time comparison
 * Skips auth if no API_KEYS are configured (open access)
 */
export const apiKeyAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const apiKeys = getApiKeys();

  // Skip auth if no keys configured (open access mode)
  if (apiKeys.size === 0) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;

  // Check for Bearer token
  if (authHeader?.startsWith('Bearer ') !== true) {
    const response: OpenAIErrorResponse = {
      error: {
        message: 'Missing or invalid Authorization header. Expected: Bearer <api_key>',
        type: 'authentication_error',
        code: 'invalid_api_key',
      },
    };
    res.status(401).json(response);
    return;
  }

  const token = authHeader.slice(7);

  // Validate API key using constant-time comparison
  if (!isValidApiKey(token, apiKeys)) {
    const requestId = res.getHeader(HEADER_REQUEST_ID) as string | undefined;
    logger.warn({ requestId }, 'Invalid API key');

    const response: OpenAIErrorResponse = {
      error: {
        message: 'Invalid API key',
        type: 'authentication_error',
        code: 'invalid_api_key',
      },
    };
    res.status(401).json(response);
    return;
  }

  next();
};

