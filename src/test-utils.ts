/**
 * Test utilities for creating properly typed mock objects
 *
 * Provides factory functions for creating mock Express Request/Response
 * objects that are compatible with Vitest 4+ stricter Mock types.
 */

import type { Request, Response } from 'express';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

/**
 * Mock Express Response with properly typed mock functions.
 */
export interface MockResponse {
  json: Mock;
  status: Mock;
  setHeader: Mock;
  getHeader: Mock;
  write: Mock;
  end: Mock;
  send: Mock;
  sendStatus: Mock;
  on: Mock;
  /** Indicates if headers have been sent (for streaming error handling) */
  headersSent: boolean;
  /** Cast to Express Response for passing to handlers */
  asResponse: () => Response;
}

/**
 * Creates a mock Express Response object with chainable methods.
 *
 * @example
 * const mockRes = createMockResponse();
 * await handler(req, mockRes.asResponse(), next);
 * expect(mockRes.json).toHaveBeenCalledWith({ data: 'test' });
 */
export function createMockResponse(): MockResponse {
  const headers: Record<string, string | number | readonly string[] | undefined> = {};

  const res: MockResponse = {
    json: vi.fn(),
    status: vi.fn(),
    setHeader: vi.fn((name: string, value: string | number | readonly string[]) => {
      headers[name.toLowerCase()] = value;
      return res;
    }),
    getHeader: vi.fn((name: string) => headers[name.toLowerCase()]),
    write: vi.fn(),
    end: vi.fn(),
    send: vi.fn(),
    sendStatus: vi.fn(),
    on: vi.fn(),
    headersSent: false,
    asResponse() {
      return this as unknown as Response;
    },
  };

  // Make methods chainable (return res for method chaining)
  res.status.mockReturnThis();
  res.send.mockReturnThis();

  return res;
}

/**
 * Creates a mock Express Request object.
 *
 * @example
 * const mockReq = createMockRequest({ body: { name: 'test' } });
 */
export function createMockRequest<T extends Partial<Request>>(overrides: T = {} as T): T {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides,
  } as T;
}

/**
 * Creates a mock NextFunction.
 */
export function createMockNext(): Mock {
  return vi.fn();
}

