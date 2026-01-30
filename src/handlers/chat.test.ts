/**
 * Tests for handlers/chat.ts
 *
 * Verifies the /v1/chat/completions endpoint handler
 */

import type { Request, Response, NextFunction } from 'express';
import { handleChatCompletion } from './chat';

interface ChatCompletionResponse {
  object: string;
  model: string;
  choices: {
    message: { role: string; content: string };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

function assertDefined<T>(value: T | undefined | null, message = 'Value is undefined'): asserts value is T {
  if (value === undefined || value === null) {
    throw new Error(message);
  }
}

// Mock the services
vi.mock('@services/augment', () => ({
  getAugmentService: vi.fn(() => ({
    generateCompletion: vi.fn().mockResolvedValue({
      text: 'Hello! How can I help you?',
      usage: { promptTokens: 10, completionTokens: 20 },
    }),
    streamCompletion: vi.fn().mockImplementation(function* () {
      yield 'Hello';
      yield '!';
    }),
  })),
}));

vi.mock('@services/context', () => ({
  getContextService: vi.fn(() => ({
    isReady: vi.fn(() => false),
    enhancePrompt: vi.fn((msg: string) => msg),
  })),
}));

describe('handlers/chat', () => {
  describe('handleChatCompletion', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let jsonMock: ReturnType<typeof vi.fn>;
    let statusMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      jsonMock = vi.fn();
      statusMock = vi.fn().mockReturnThis();
      mockRes = {
        json: jsonMock,
        status: statusMock,
        setHeader: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      };
      mockNext = vi.fn();
    });

    it('should return 400 for invalid request', async () => {
      mockReq = { body: {} };

      await handleChatCompletion(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            type: 'invalid_request_error',
          }) as Record<string, unknown>,
        })
      );
    });

    it('should return 400 for empty messages array', async () => {
      mockReq = { body: { messages: [] } };

      await handleChatCompletion(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should return completion for valid non-streaming request', async () => {
      mockReq = {
        body: {
          messages: [{ role: 'user', content: 'Hello' }],
          stream: false,
        },
      };

      await handleChatCompletion(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(jsonMock).toHaveBeenCalledTimes(1);
      const calls = jsonMock.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      assertDefined(calls[0]);
      const response = calls[0][0] as ChatCompletionResponse;

      expect(response.object).toBe('chat.completion');
      expect(response.choices).toHaveLength(1);
      assertDefined(response.choices[0]);
      expect(response.choices[0].message.role).toBe('assistant');
      expect(response.choices[0].message.content).toBe('Hello! How can I help you?');
      expect(response.choices[0].finish_reason).toBe('stop');
    });

    it('should include usage in response', async () => {
      mockReq = {
        body: {
          messages: [{ role: 'user', content: 'Hello' }],
        },
      };

      await handleChatCompletion(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      const calls = jsonMock.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      assertDefined(calls[0]);
      const response = calls[0][0] as ChatCompletionResponse;
      expect(response.usage).toEqual({
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      });
    });

    it('should use default model when not specified', async () => {
      mockReq = {
        body: {
          messages: [{ role: 'user', content: 'Hello' }],
        },
      };

      await handleChatCompletion(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      const calls = jsonMock.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      assertDefined(calls[0]);
      const response = calls[0][0] as ChatCompletionResponse;
      expect(response.model).toBe('claude-sonnet-4-5');
    });

    it('should handle streaming request', async () => {
      const writeMock = vi.fn();
      const endMock = vi.fn();
      mockReq = {
        body: {
          messages: [{ role: 'user', content: 'Hello' }],
          stream: true,
        },
      };
      mockRes = {
        ...mockRes,
        write: writeMock,
        end: endMock,
      };

      await handleChatCompletion(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(writeMock).toHaveBeenCalled();
      expect(endMock).toHaveBeenCalled();
    });

    it('should handle system and assistant messages', async () => {
      mockReq = {
        body: {
          messages: [
            { role: 'system', content: 'You are helpful' },
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' },
            { role: 'user', content: 'How are you?' },
          ],
        },
      };

      await handleChatCompletion(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(jsonMock).toHaveBeenCalledTimes(1);
    });

    it('should handle request without user messages', async () => {
      mockReq = {
        body: {
          messages: [{ role: 'system', content: 'You are helpful' }],
        },
      };

      await handleChatCompletion(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(jsonMock).toHaveBeenCalledTimes(1);
    });
  });
});

