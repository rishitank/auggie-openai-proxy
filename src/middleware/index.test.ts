/**
 * Tests for middleware/index.ts
 *
 * Verifies Express middleware functionality
 */

import type { Request, Response, NextFunction } from 'express';
import type { MockInstance } from 'vitest';
import { requestLogger, errorHandler, metricsRecorder, cors, requestTimeout, securityHeaders, requestId } from './index';
import * as metricsService from '#services/metrics';
import { createMockResponse, createMockNext, type MockResponse } from '../test-utils';

const noop: () => void = () => undefined;

describe('middleware', () => {
  describe('requestLogger', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let consoleSpy: MockInstance<(message?: unknown, ...optionalParams: unknown[]) => void>;

    beforeEach(() => {
      mockReq = {
        method: 'GET',
        path: '/v1/models',
      };
      mockRes = {};
      mockNext = noop;
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(noop);
    });

    it('should log request method and path', () => {
      requestLogger(mockReq as Request, mockRes as Response, mockNext);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const logCalls = consoleSpy.mock.calls as string[][];
      expect(logCalls.length).toBeGreaterThan(0);
      const firstArg = logCalls[0]?.[0];
      expect(firstArg).toContain('GET');
      expect(firstArg).toContain('/v1/models');
    });

    it('should call next()', () => {
      const nextSpy = vi.fn();
      requestLogger(mockReq as Request, mockRes as Response, nextSpy);

      expect(nextSpy).toHaveBeenCalledTimes(1);
    });

    it('should include timestamp in log', () => {
      requestLogger(mockReq as Request, mockRes as Response, mockNext);

      // Timestamp format: [YYYY-MM-DDTHH:MM:SS.sssZ]
      const logCalls = consoleSpy.mock.calls as string[][];
      expect(logCalls.length).toBeGreaterThan(0);
      const firstArg = logCalls[0]?.[0];
      expect(firstArg).toMatch(/\[\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('errorHandler', () => {
    let mockReq: Partial<Request>;
    let mockRes: MockResponse;
    let mockNext: ReturnType<typeof createMockNext>;
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      mockReq = {};
      mockRes = createMockResponse();
      mockNext = createMockNext();
      consoleSpy = vi.spyOn(console, 'error').mockImplementation(noop);
    });

    it('should return 500 status', () => {
      const error = new Error('Test error');

      errorHandler(error, mockReq as Request, mockRes.asResponse(), mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should return OpenAI-compatible error format', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, mockReq as Request, mockRes.asResponse(), mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'Something went wrong',
          type: 'server_error',
          code: 'internal_error',
        },
      });
    });

    it('should use default message when error has no message', () => {
      const error = new Error('');

      errorHandler(error, mockReq as Request, mockRes.asResponse(), mockNext);

      interface ErrorResponse {
        error: {
          message: string;
          type: string;
          code: string;
        };
      }

      const calls = mockRes.json.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const response = calls[0]?.[0] as ErrorResponse;
      expect(response.error.message).toBe('Internal server error');
    });

    it('should log the error', () => {
      const error = new Error('Test error');

      errorHandler(error, mockReq as Request, mockRes.asResponse(), mockNext);

      expect(consoleSpy).toHaveBeenCalledWith('[Error]', error);
    });
  });

  describe('metricsRecorder', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let recordRequestSpy: ReturnType<typeof vi.spyOn>;
    let finishHandler: (() => void) | undefined;

    beforeEach(() => {
      mockReq = {
        method: 'POST',
        path: '/v1/chat/completions',
        route: { path: '/v1/chat/completions' },
      };
      mockRes = {
        statusCode: 200,
        on: vi.fn((event: string, handler: () => void) => {
          if (event === 'finish') {
            finishHandler = handler;
          }
          return mockRes as Response;
        }),
      };
      mockNext = vi.fn();
      recordRequestSpy = vi.spyOn(metricsService, 'recordRequest').mockImplementation(noop);
    });

    it('should call next()', () => {
      metricsRecorder(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should record request on finish', () => {
      metricsRecorder(mockReq as Request, mockRes as Response, mockNext);
      expect(finishHandler).toBeDefined();
      finishHandler?.();
      expect(recordRequestSpy).toHaveBeenCalledWith('POST /v1/chat/completions', 200);
    });

    it('should use path when route is undefined', () => {
      mockReq.route = undefined;
      metricsRecorder(mockReq as Request, mockRes as Response, mockNext);
      finishHandler?.();
      expect(recordRequestSpy).toHaveBeenCalledWith('POST /v1/chat/completions', 200);
    });
  });

  describe('cors', () => {
    let mockReq: Partial<Request>;
    let mockRes: MockResponse;
    let mockNext: ReturnType<typeof createMockNext>;

    beforeEach(() => {
      mockReq = { method: 'GET' };
      mockRes = createMockResponse();
      mockRes.status.mockReturnValue({ end: mockRes.end });
      mockNext = createMockNext();
    });

    it('should set CORS headers', () => {
      cors(mockReq as Request, mockRes.asResponse(), mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Max-Age', '86400');
    });

    it('should call next() for non-OPTIONS requests', () => {
      cors(mockReq as Request, mockRes.asResponse(), mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should return 204 for OPTIONS preflight requests', () => {
      mockReq.method = 'OPTIONS';
      cors(mockReq as Request, mockRes.asResponse(), mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.end).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requestTimeout', () => {
    let mockReq: Partial<Request>;
    let mockRes: MockResponse & { headersSent: boolean; on: ReturnType<typeof vi.fn> };
    let mockNext: ReturnType<typeof createMockNext>;
    let finishHandler: (() => void) | undefined;
    let closeHandler: (() => void) | undefined;

    beforeEach(() => {
      vi.useFakeTimers();
      mockReq = { body: {} };
      const baseMockRes = createMockResponse();
      baseMockRes.status.mockReturnValue({ json: baseMockRes.json });
      mockRes = {
        ...baseMockRes,
        headersSent: false,
        on: vi.fn((event: string, handler: () => void) => {
          if (event === 'finish') finishHandler = handler;
          if (event === 'close') closeHandler = handler;
          return mockRes as unknown as Response;
        }),
      };
      mockNext = createMockNext();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should call next()', () => {
      const middleware = requestTimeout(1000);
      middleware(mockReq as Request, mockRes as unknown as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should skip timeout for streaming requests', () => {
      mockReq.body = { stream: true };
      const middleware = requestTimeout(1000);
      middleware(mockReq as Request, mockRes as unknown as Response, mockNext);

      vi.advanceTimersByTime(2000);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 504 on timeout', () => {
      const middleware = requestTimeout(1000);
      middleware(mockReq as Request, mockRes as unknown as Response, mockNext);

      vi.advanceTimersByTime(1001);

      expect(mockRes.status).toHaveBeenCalledWith(504);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'Request timeout',
          type: 'timeout_error',
          code: 'request_timeout',
        },
      });
    });

    it('should not send response if headers already sent', () => {
      mockRes.headersSent = true;
      const middleware = requestTimeout(1000);
      middleware(mockReq as Request, mockRes as unknown as Response, mockNext);

      vi.advanceTimersByTime(1001);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should clear timeout on finish', () => {
      const middleware = requestTimeout(1000);
      middleware(mockReq as Request, mockRes as unknown as Response, mockNext);

      finishHandler?.();
      vi.advanceTimersByTime(1001);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should clear timeout on close', () => {
      const middleware = requestTimeout(1000);
      middleware(mockReq as Request, mockRes as unknown as Response, mockNext);

      closeHandler?.();
      vi.advanceTimersByTime(1001);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('securityHeaders', () => {
    let mockReq: Partial<Request>;
    let mockRes: MockResponse;

    beforeEach(() => {
      mockReq = {};
      mockRes = createMockResponse();
    });

    it('should set X-Content-Type-Options header', () => {
      const nextSpy = vi.fn();
      securityHeaders(mockReq as Request, mockRes.asResponse(), nextSpy);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    });

    it('should set X-Frame-Options header', () => {
      const nextSpy = vi.fn();
      securityHeaders(mockReq as Request, mockRes.asResponse(), nextSpy);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    });

    it('should set X-XSS-Protection header', () => {
      const nextSpy = vi.fn();
      securityHeaders(mockReq as Request, mockRes.asResponse(), nextSpy);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
    });

    it('should set Referrer-Policy header', () => {
      const nextSpy = vi.fn();
      securityHeaders(mockReq as Request, mockRes.asResponse(), nextSpy);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
    });

    it('should call next()', () => {
      const nextSpy = vi.fn();
      securityHeaders(mockReq as Request, mockRes.asResponse(), nextSpy);

      expect(nextSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('requestId', () => {
    let mockReq: Partial<Request>;
    let mockRes: MockResponse;

    beforeEach(() => {
      mockReq = {
        headers: {},
      };
      mockRes = createMockResponse();
    });

    it('should generate a UUID when no X-Request-ID header is provided', () => {
      const nextSpy = vi.fn();
      requestId(mockReq as Request, mockRes.asResponse(), nextSpy);

      expect(mockRes.setHeader).toHaveBeenCalledTimes(1);
      const [headerName, headerValue] = mockRes.setHeader.mock.calls[0] as [string, string];
      expect(headerName).toBe('X-Request-ID');
      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      expect(headerValue).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should use existing X-Request-ID header if provided', () => {
      mockReq.headers = { 'x-request-id': 'existing-request-id-123' };
      const nextSpy = vi.fn();
      requestId(mockReq as Request, mockRes.asResponse(), nextSpy);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', 'existing-request-id-123');
    });

    it('should generate new ID if X-Request-ID header is empty string', () => {
      mockReq.headers = { 'x-request-id': '' };
      const nextSpy = vi.fn();
      requestId(mockReq as Request, mockRes.asResponse(), nextSpy);

      const [, headerValue] = mockRes.setHeader.mock.calls[0] as [string, string];
      expect(headerValue).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should call next()', () => {
      const nextSpy = vi.fn();
      requestId(mockReq as Request, mockRes.asResponse(), nextSpy);

      expect(nextSpy).toHaveBeenCalledTimes(1);
    });
  });
});

