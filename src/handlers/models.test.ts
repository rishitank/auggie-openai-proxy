/**
 * Tests for handlers/models.ts
 *
 * Verifies the /v1/models endpoint handler
 */

import type { Request, Response } from 'express';
import { handleModelsList } from './models';

interface ModelsListResponse {
  object: string;
  data: {
    id: string;
    object: string;
    owned_by: string;
    created: number;
  }[];
}

// Mock the augment service - use #services path (subpath imports)
vi.mock('#services/augment', () => ({
  getAugmentService: vi.fn(() => ({
    getAvailableModels: vi.fn(() => ['claude-sonnet-4-5', 'gpt-5']),
  })),
}));

describe('handlers/models', () => {
  describe('handleModelsList', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let jsonMock: ReturnType<typeof vi.fn>;

    function assertDefined<T>(value: T | undefined | null): asserts value is T {
      if (value === undefined || value === null) {
        throw new Error('Value is undefined');
      }
    }

    beforeEach(() => {
      mockReq = {};
      jsonMock = vi.fn();
      mockRes = {
        json: jsonMock,
      };
    });

    it('should return list of models in OpenAI format', () => {
      handleModelsList(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledTimes(1);
      const calls = jsonMock.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const firstCall = calls[0];
      assertDefined(firstCall);
      const response = firstCall[0] as ModelsListResponse;

      expect(response.object).toBe('list');
      expect(response.data).toHaveLength(2);
    });

    it('should return models with correct structure', () => {
      handleModelsList(mockReq as Request, mockRes as Response);

      const calls = jsonMock.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const firstCall = calls[0];
      assertDefined(firstCall);
      const response = firstCall[0] as ModelsListResponse;
      const model = response.data[0];
      assertDefined(model);

      expect(model.id).toBe('claude-sonnet-4-5');
      expect(model.object).toBe('model');
      expect(model.owned_by).toBe('augment');
      expect(typeof model.created).toBe('number');
    });

    it('should include all available models', () => {
      handleModelsList(mockReq as Request, mockRes as Response);

      const calls = jsonMock.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const firstCall = calls[0];
      assertDefined(firstCall);
      const response = firstCall[0] as ModelsListResponse;
      const modelIds = response.data.map((m) => m.id);

      expect(modelIds).toContain('claude-sonnet-4-5');
      expect(modelIds).toContain('gpt-5');
    });
  });
});

