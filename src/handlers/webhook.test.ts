/**
 * Tests for handlers/webhook.ts
 *
 * Verifies the webhook endpoint handlers
 */

import type { Request } from 'express';
import { handleWebhook, listWebhooks } from './webhook';
import { createMockResponse, createMockNext, type MockResponse } from '../test-utils';

// Type definitions for webhook responses
interface WebhookInfo {
  name: string;
  enabled: boolean;
  model?: string;
  hasSystemPrompt: boolean;
}

interface ListWebhooksResponse {
  count: number;
  webhooks: WebhookInfo[];
}

// Mock the config module - use #config path (subpath imports)
vi.mock('#config', () => ({
  loadConfig: vi.fn(() => ({
    port: 3456,
    defaultModel: 'claude-sonnet-4-5',
    webhooks: [
      { name: 'test-webhook', enabled: true, model: 'gpt-5' },
      { name: 'disabled-webhook', enabled: false },
      { name: 'with-prompt', enabled: true, systemPrompt: 'Be helpful' },
    ],
  })),
}));

// Mock OpenAI client - use a class for Vitest 4 constructor mock compatibility
vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Response from AI' } }],
          usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 },
        }),
      },
    };
  },
}));

describe('handlers/webhook', () => {
  function assertDefined<T>(value: T | undefined | null): asserts value is T {
    if (value === undefined || value === null) {
      throw new Error('Value is undefined');
    }
  }

  describe('listWebhooks', () => {
    let mockReq: Partial<Request>;
    let mockRes: MockResponse;

    beforeEach(() => {
      mockReq = {};
      mockRes = createMockResponse();
    });

    it('should return list of configured webhooks', () => {
      listWebhooks(mockReq as Request, mockRes.asResponse());

      expect(mockRes.json).toHaveBeenCalledTimes(1);
      const calls = mockRes.json.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const firstCall = calls[0];
      assertDefined(firstCall);
      const response = firstCall[0] as ListWebhooksResponse;

      expect(response.count).toBe(3);
      expect(response.webhooks).toHaveLength(3);
    });

    it('should include webhook details', () => {
      listWebhooks(mockReq as Request, mockRes.asResponse());

      const calls = mockRes.json.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const firstCall = calls[0];
      assertDefined(firstCall);
      const response = firstCall[0] as ListWebhooksResponse;
      const webhook = response.webhooks.find((w) => w.name === 'test-webhook');

      expect(webhook).toBeDefined();
      if (webhook) {
        expect(webhook.name).toBe('test-webhook');
        expect(webhook.enabled).toBe(true);
        expect(webhook.model).toBe('gpt-5');
      }
    });

    it('should indicate system prompt presence', () => {
      listWebhooks(mockReq as Request, mockRes.asResponse());

      const calls = mockRes.json.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const firstCall = calls[0];
      assertDefined(firstCall);
      const response = firstCall[0] as ListWebhooksResponse;
      const withPrompt = response.webhooks.find((w) => w.name === 'with-prompt');
      const withoutPrompt = response.webhooks.find((w) => w.name === 'test-webhook');

      expect(withPrompt).toBeDefined();
      expect(withoutPrompt).toBeDefined();
      if (withPrompt && withoutPrompt) {
        expect(withPrompt.hasSystemPrompt).toBe(true);
        expect(withoutPrompt.hasSystemPrompt).toBe(false);
      }
    });
  });

  describe('handleWebhook', () => {
    let mockReq: Partial<Request<{ name: string }>>;
    let mockRes: MockResponse;
    let mockNext: ReturnType<typeof createMockNext>;

    beforeEach(() => {
      mockRes = createMockResponse();
      mockNext = createMockNext();
    });

    it('should return 404 for unknown webhook', async () => {
      mockReq = { params: { name: 'unknown' }, body: { text: 'Hello' } };

      await handleWebhook(
        mockReq as Request<{ name: string }>,
        mockRes.asResponse(),
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      const calls = mockRes.json.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const firstCall = calls[0];
      assertDefined(firstCall);
      const errorResponse = firstCall[0] as { error: { message: string; type: string; code: string } };
      expect(errorResponse.error.message).toContain('not found');
      expect(errorResponse.error.type).toBe('not_found_error');
      expect(errorResponse.error.code).toBe('webhook_not_found');
    });

    it('should return 503 for disabled webhook', async () => {
      mockReq = { params: { name: 'disabled-webhook' }, body: { text: 'Hello' } };

      await handleWebhook(
        mockReq as Request<{ name: string }>,
        mockRes.asResponse(),
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(503);
    });

    it('should return 400 for invalid payload', async () => {
      mockReq = { params: { name: 'test-webhook' }, body: {} };

      await handleWebhook(
        mockReq as Request<{ name: string }>,
        mockRes.asResponse(),
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should process valid webhook request', async () => {
      mockReq = { params: { name: 'test-webhook' }, body: { text: 'Hello' } };

      await handleWebhook(
        mockReq as Request<{ name: string }>,
        mockRes.asResponse(),
        mockNext
      );

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          webhook: 'test-webhook',
          response: 'Response from AI',
        })
      );
    });

    it('should accept various prompt field names', async () => {
      // All supported fields including IFTTT value1, value2, value3
      const fields = ['text', 'prompt', 'message', 'query', 'content', 'input', 'value3', 'value2', 'value1'];

      for (const field of fields) {
        mockReq = { params: { name: 'test-webhook' }, body: { [field]: 'Test' } };

        await handleWebhook(
          mockReq as Request<{ name: string }>,
          mockRes.asResponse(),
          mockNext
        );

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ success: true })
        );
      }
    });
  });
});

