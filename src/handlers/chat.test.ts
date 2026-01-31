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

// Mock the services - use #services path (subpath imports)
vi.mock('#services/augment', () => ({
  getAugmentService: vi.fn(() => ({
    isInitialized: true,
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

vi.mock('#services/context', () => ({
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
        prompt_tokens_details: {
          cached_tokens: 0,
          audio_tokens: 0,
        },
        completion_tokens_details: {
          reasoning_tokens: 0,
          audio_tokens: 0,
          accepted_prediction_tokens: 0,
          rejected_prediction_tokens: 0,
        },
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

    // Parameterized tests for OpenAI tool/function message formats
    const toolMessageFormats = [
      {
        name: 'basic tool role message',
        messages: [
          { role: 'user', content: 'Calculate 2+2' },
          { role: 'assistant', content: 'I will calculate that.' },
          { role: 'tool', content: 'Result: 4' },
          { role: 'user', content: 'Thanks!' },
        ],
      },
      {
        name: 'basic function role message (legacy)',
        messages: [
          { role: 'user', content: 'What is the weather?' },
          { role: 'assistant', content: 'Let me check.' },
          { role: 'function', content: '{"temp": 72}' },
          { role: 'user', content: 'Thanks!' },
        ],
      },
      {
        name: 'tool message with tool_call_id',
        messages: [
          { role: 'user', content: 'Calculate 2+2' },
          {
            role: 'assistant',
            content: null,
            tool_calls: [
              { id: 'call_abc123', type: 'function', function: { name: 'calculator', arguments: '{}' } },
            ],
          },
          { role: 'tool', content: '4', tool_call_id: 'call_abc123' },
          { role: 'user', content: 'Thanks!' },
        ],
      },
      {
        name: 'assistant with null content and tool_calls',
        messages: [
          { role: 'user', content: 'What is the weather in NYC?' },
          {
            role: 'assistant',
            content: null,
            tool_calls: [
              { id: 'call_weather_123', type: 'function', function: { name: 'get_weather', arguments: '{}' } },
            ],
          },
        ],
      },
      {
        name: 'function message with name field (legacy)',
        messages: [
          { role: 'user', content: 'Get weather' },
          { role: 'assistant', content: null, function_call: { name: 'get_weather', arguments: '{}' } },
          { role: 'function', name: 'get_weather', content: '{"temp": 72}' },
          { role: 'user', content: 'Thanks!' },
        ],
      },
    ];

    it.each(toolMessageFormats)(
      'should accept and process $name',
      async ({ messages }) => {
        mockReq = { body: { messages } };

        await handleChatCompletion(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        // Should succeed (not return 400)
        expect(statusMock).not.toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledTimes(1);
      }
    );

    // Model aliasing tests
    describe('model aliasing', () => {
      const modelAliasCases = [
        { input: 'gpt-4o', expected: 'gpt-5' },
        { input: 'gpt-4-turbo', expected: 'gpt-5' },
        { input: 'claude-3-opus-20240229', expected: 'claude-opus-4-5' },
        { input: 'claude-3-sonnet-20240229', expected: 'claude-sonnet-4-5' },
        { input: 'claude-3-haiku-20240307', expected: 'claude-haiku-4-5' },
      ];

      it.each(modelAliasCases)(
        'should resolve model alias $input to $expected',
        async ({ input, expected }) => {
          mockReq = {
            body: {
              model: input,
              messages: [{ role: 'user', content: 'Hello' }],
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
          expect(response.model).toBe(expected);
        }
      );

      it('should pass through available models unchanged', async () => {
        mockReq = {
          body: {
            model: 'claude-sonnet-4-5',
            messages: [{ role: 'user', content: 'Hello' }],
          },
        };

        await handleChatCompletion(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(jsonMock).toHaveBeenCalledTimes(1);
        const calls = jsonMock.mock.calls;
        assertDefined(calls[0]);
        const response = calls[0][0] as ChatCompletionResponse;
        expect(response.model).toBe('claude-sonnet-4-5');
      });

      it('should return 400 for unknown model with no alias', async () => {
        mockReq = {
          body: {
            model: 'unknown-model-xyz',
            messages: [{ role: 'user', content: 'Hello' }],
          },
        };

        await handleChatCompletion(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(statusMock).toHaveBeenCalledWith(400);
        const calls = jsonMock.mock.calls;
        assertDefined(calls[0]);
        const errorResponse = calls[0][0] as { error: { message: string; code: string } };
        expect(errorResponse.error.message).toContain('Unknown model');
        expect(errorResponse.error.code).toBe('model_not_found');
      });

      it('should suggest available models in error message', async () => {
        mockReq = {
          body: {
            model: 'invalid-model',
            messages: [{ role: 'user', content: 'Hello' }],
          },
        };

        await handleChatCompletion(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(statusMock).toHaveBeenCalledWith(400);
        const calls = jsonMock.mock.calls;
        assertDefined(calls[0]);
        const errorResponse = calls[0][0] as { error: { message: string } };
        expect(errorResponse.error.message).toContain('Available models:');
      });
    });
  });
});

