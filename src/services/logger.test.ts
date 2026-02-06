/**
 * Tests for services/logger.ts
 *
 * Verifies structured logging functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original env values
const originalEnv = { ...process.env };

describe('services/logger', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('logger creation', () => {
    it('should export a logger instance', async () => {
      const { logger } = await import('./logger');
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should use default log level in development', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.LOG_LEVEL;
      const { logger } = await import('./logger');
      expect(logger.level).toBe('debug');
    });

    it('should use info level in production by default', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.LOG_LEVEL;
      const { logger } = await import('./logger');
      expect(logger.level).toBe('info');
    });

    it('should respect LOG_LEVEL environment variable', async () => {
      process.env.LOG_LEVEL = 'warn';
      const { logger } = await import('./logger');
      expect(logger.level).toBe('warn');
    });

    it('should ignore invalid LOG_LEVEL values', async () => {
      process.env.LOG_LEVEL = 'invalid-level';
      process.env.NODE_ENV = 'development';
      const { logger } = await import('./logger');
      expect(logger.level).toBe('debug');
    });
  });

  describe('createRequestLogger', () => {
    it('should create a child logger with requestId', async () => {
      const { createRequestLogger } = await import('./logger');
      const requestLogger = createRequestLogger('test-request-id');
      expect(requestLogger).toBeDefined();
      expect(typeof requestLogger.info).toBe('function');
    });
  });

  describe('createChildLogger', () => {
    it('should create a child logger with custom context', async () => {
      const { createChildLogger } = await import('./logger');
      const childLogger = createChildLogger({ userId: 'user-123' });
      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe('function');
    });
  });

  describe('redactSensitive', () => {
    it('should redact sensitive fields', async () => {
      const { redactSensitive } = await import('./logger');

      const input = {
        apiKey: 'secret-key-123',
        token: 'bearer-token',
        password: 'my-password',
        name: 'John',
      };

      const result = redactSensitive(input);

      expect(result.apiKey).toBe('[REDACTED]');
      expect(result.token).toBe('[REDACTED]');
      expect(result.password).toBe('[REDACTED]');
      expect(result.name).toBe('John');
    });

    it('should handle case-insensitive field names', async () => {
      const { redactSensitive } = await import('./logger');

      const input = {
        API_KEY: 'secret',
        Authorization: 'bearer xyz',
        userApiKey: 'another-secret',
      };

      const result = redactSensitive(input);

      expect(result.API_KEY).toBe('[REDACTED]');
      expect(result.Authorization).toBe('[REDACTED]');
      expect(result.userApiKey).toBe('[REDACTED]');
    });

    it('should not modify non-sensitive fields', async () => {
      const { redactSensitive } = await import('./logger');

      const input = {
        username: 'testuser',
        email: 'test@example.com',
        count: 42,
      };

      const result = redactSensitive(input);

      expect(result.username).toBe('testuser');
      expect(result.email).toBe('test@example.com');
      expect(result.count).toBe(42);
    });
  });
});

