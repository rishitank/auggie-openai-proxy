/**
 * Tests for middleware/index.ts
 *
 * Verifies Express middleware functionality
 */

import type { Request, Response, NextFunction } from 'express';
import { requestLogger, errorHandler } from './index';

const noop: () => void = () => undefined;

describe('middleware', () => {
  describe('requestLogger', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let consoleSpy: ReturnType<typeof vi.spyOn>;

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
      const logCalls = consoleSpy.mock.calls;
      expect(logCalls.length).toBeGreaterThan(0);
      const firstArg = logCalls[0]?.[0] as string;
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
      const logCalls = consoleSpy.mock.calls;
      expect(logCalls.length).toBeGreaterThan(0);
      const firstArg = logCalls[0]?.[0] as string;
      expect(firstArg).toMatch(/\[\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('errorHandler', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let jsonMock: ReturnType<typeof vi.fn>;
    let statusMock: ReturnType<typeof vi.fn>;
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      mockReq = {};
      jsonMock = vi.fn();
      statusMock = vi.fn().mockReturnThis();
      mockRes = {
        json: jsonMock,
        status: statusMock,
      };
      mockNext = noop;
      consoleSpy = vi.spyOn(console, 'error').mockImplementation(noop);
    });

    it('should return 500 status', () => {
      const error = new Error('Test error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
    });

    it('should return OpenAI-compatible error format', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          message: 'Something went wrong',
          type: 'server_error',
          code: 'internal_error',
        },
      });
    });

    it('should use default message when error has no message', () => {
      const error = new Error('');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      interface ErrorResponse {
        error: {
          message: string;
          type: string;
          code: string;
        };
      }

      const calls = jsonMock.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const response = calls[0]?.[0] as ErrorResponse;
      expect(response.error.message).toBe('Internal server error');
    });

    it('should log the error', () => {
      const error = new Error('Test error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith('[Error]', error);
    });
  });
});

