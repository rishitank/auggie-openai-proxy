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
  write: Mock;
  end: Mock;
  send: Mock;
  sendStatus: Mock;
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
  const res: MockResponse = {
    json: vi.fn(),
    status: vi.fn(),
    setHeader: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
    send: vi.fn(),
    sendStatus: vi.fn(),
    asResponse() {
      return this as unknown as Response;
    },
  };

  // Make methods chainable (return res for method chaining)
  res.status.mockReturnThis();
  res.setHeader.mockReturnThis();
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

