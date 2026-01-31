/**
 * Tests for types/index.ts
 *
 * Verifies Zod schema validation for API requests
 */

import {
  MessageRole,
  ContentType,
  FinishReason,
  MessageRoleSchema,
  OpenAIMessageSchema,
  ChatCompletionRequestSchema,
  WebhookRequestSchema,
  WebhookConfigSchema,
  normalizeMessageContent,
} from './index';

describe('types', () => {
  describe('Enums', () => {
    it.each([
      [MessageRole.System, 'system'],
      [MessageRole.User, 'user'],
      [MessageRole.Assistant, 'assistant'],
      [MessageRole.Developer, 'developer'],
      [MessageRole.Tool, 'tool'],
      [MessageRole.Function, 'function'],
    ])('MessageRole.%s should equal "%s"', (enumValue, expected) => {
      expect(enumValue).toBe(expected);
    });

    it('should have correct ContentType values', () => {
      expect(ContentType.Text).toBe('text');
    });

    it.each([
      [FinishReason.Stop, 'stop'],
      [FinishReason.Length, 'length'],
    ])('FinishReason.%s should equal "%s"', (enumValue, expected) => {
      expect(enumValue).toBe(expected);
    });
  });

  describe('MessageRoleSchema', () => {
    it.each(['system', 'user', 'assistant', 'developer', 'tool', 'function'])(
      'should accept valid role: %s',
      (role) => {
        expect(MessageRoleSchema.parse(role)).toBe(role);
      }
    );

    it.each(['invalid', '', 'admin', 'bot', 'AI'])(
      'should reject invalid role: %s',
      (role) => {
        expect(() => MessageRoleSchema.parse(role)).toThrow();
      }
    );
  });

  describe('OpenAIMessageSchema', () => {
    describe('valid messages', () => {
      it.each([
        ['basic user message', { role: 'user', content: 'Hello' }],
        ['basic assistant message', { role: 'assistant', content: 'Hi there' }],
        ['system message', { role: 'system', content: 'You are helpful' }],
        ['null content (tool call)', { role: 'assistant', content: null }],
        ['tool message with tool_call_id', { role: 'tool', content: '4', tool_call_id: 'call_abc' }],
        ['function message with name', { role: 'function', content: '{}', name: 'get_data' }],
      ])('should accept %s', (_, msg) => {
        expect(() => OpenAIMessageSchema.parse(msg)).not.toThrow();
      });
    });

    it('should preserve extra fields via passthrough', () => {
      const msg = {
        role: 'assistant',
        content: null,
        tool_calls: [{ id: 'call_123', type: 'function', function: { name: 'calc', arguments: '{}' } }],
      };
      const result = OpenAIMessageSchema.parse(msg);
      expect(result.tool_calls).toHaveLength(1);
    });

    describe('invalid messages', () => {
      it.each([
        ['missing role', { content: 'Hello' }],
        ['missing content', { role: 'user' }],
        ['empty object', {}],
      ])('should reject %s', (_, msg) => {
        expect(() => OpenAIMessageSchema.parse(msg)).toThrow();
      });
    });
  });

  describe('normalizeMessageContent', () => {
    it.each([
      ['string content', { role: MessageRole.User, content: 'Hello' }, 'Hello'],
      ['null content', { role: MessageRole.Assistant, content: null }, ''],
      ['empty string', { role: MessageRole.User, content: '' }, ''],
    ])('should normalize %s to expected output', (_, msg, expected) => {
      const result = normalizeMessageContent(msg);
      expect(result.content).toBe(expected);
    });

    it('should join array content parts', () => {
      const msg = {
        role: MessageRole.User,
        content: [
          { type: 'text' as const, text: 'Hello ' },
          { type: 'text' as const, text: 'World' },
        ],
      };
      expect(normalizeMessageContent(msg).content).toBe('Hello World');
    });

    // TDD: Image content should be filtered out gracefully, keeping only text parts
    describe('image content handling', () => {
      it('should filter out image_url parts and keep text parts', () => {
        const msg = {
          role: MessageRole.User,
          content: [
            { type: 'text', text: 'Here is an image: ' },
            { type: 'image_url', image_url: { url: 'https://example.com/img.jpg' } },
            { type: 'text', text: ' What do you see?' },
          ],
        };
        const result = normalizeMessageContent(msg as Parameters<typeof normalizeMessageContent>[0]);
        expect(result.content).toBe('Here is an image:  What do you see?');
      });

      it('should handle content with only image_url parts', () => {
        const msg = {
          role: MessageRole.User,
          content: [
            { type: 'image_url', image_url: { url: 'https://example.com/img.jpg' } },
          ],
        };
        const result = normalizeMessageContent(msg as Parameters<typeof normalizeMessageContent>[0]);
        expect(result.content).toBe('');
      });
    });
  });

  describe('ChatCompletionRequestSchema', () => {
    const baseMessages = [{ role: 'user', content: 'Hello' }];

    it('should apply defaults', () => {
      const result = ChatCompletionRequestSchema.parse({ messages: baseMessages });
      expect(result.model).toBe('claude-sonnet-4-5');
      expect(result.stream).toBe(false);
      expect(result.n).toBe(1);
    });

    describe('temperature validation', () => {
      it.each([0, 0.5, 1, 1.5, 2])('should accept valid temperature: %s', (temp) => {
        const result = ChatCompletionRequestSchema.parse({ messages: baseMessages, temperature: temp });
        expect(result.temperature).toBe(temp);
      });

      it.each([-0.1, 2.1, 3, -1])('should reject invalid temperature: %s', (temp) => {
        expect(() => ChatCompletionRequestSchema.parse({ messages: baseMessages, temperature: temp })).toThrow();
      });
    });

    describe('max_tokens validation', () => {
      it.each([1, 100, 4096])('should accept valid max_tokens: %s', (tokens) => {
        const result = ChatCompletionRequestSchema.parse({ messages: baseMessages, max_tokens: tokens });
        expect(result.max_tokens).toBe(tokens);
      });

      it.each([0, -1, -100])('should reject invalid max_tokens: %s', (tokens) => {
        expect(() => ChatCompletionRequestSchema.parse({ messages: baseMessages, max_tokens: tokens })).toThrow();
      });
    });

    it('should reject empty messages array', () => {
      expect(() => ChatCompletionRequestSchema.parse({ messages: [] })).toThrow();
    });

    // TDD: These tests document that extra OpenAI fields should be preserved
    describe('passthrough for extra OpenAI fields', () => {
      it.each([
        ['response_format', { type: 'json_object' }],
        ['tool_choice', 'auto'],
        ['parallel_tool_calls', true],
        ['service_tier', 'default'],
      ])('should preserve %s field', (field, value) => {
        const req = { messages: baseMessages, [field]: value };
        const result = ChatCompletionRequestSchema.parse(req);
        expect(result[field]).toEqual(value);
      });

      it('should preserve tools array', () => {
        const tools = [
          { type: 'function', function: { name: 'get_weather', parameters: {} } },
        ];
        const result = ChatCompletionRequestSchema.parse({ messages: baseMessages, tools });
        expect(result.tools).toEqual(tools);
      });

      it('should preserve functions array (legacy)', () => {
        const functions = [{ name: 'get_weather', parameters: {} }];
        const result = ChatCompletionRequestSchema.parse({ messages: baseMessages, functions });
        expect(result.functions).toEqual(functions);
      });
    });
  });

  describe('WebhookRequestSchema', () => {
    describe('message field variants', () => {
      it.each([
        ['text', { text: 'Hello' }],
        ['prompt', { prompt: 'Hello' }],
        ['message', { message: 'Hello' }],
        ['query', { query: 'Hello' }],
        ['input', { input: 'Hello' }],
        ['value1 (IFTTT)', { value1: 'Hello' }],
      ])('should accept %s field', (_, payload) => {
        expect(() => WebhookRequestSchema.parse(payload)).not.toThrow();
      });
    });

    it('should accept optional overrides', () => {
      const result = WebhookRequestSchema.parse({
        text: 'Hello',
        model: 'gpt-5',
        system_prompt: 'Be helpful',
      });
      expect(result.model).toBe('gpt-5');
      expect(result.system_prompt).toBe('Be helpful');
    });

    it.each([{}, { model: 'gpt-5' }, { temperature: 0.5 }])(
      'should reject request without message field: %o',
      (payload) => {
        expect(() => WebhookRequestSchema.parse(payload)).toThrow();
      }
    );
  });

  describe('WebhookConfigSchema', () => {
    it('should apply defaults for minimal config', () => {
      const result = WebhookConfigSchema.parse({ name: 'test' });
      expect(result.name).toBe('test');
      expect(result.enabled).toBe(true);
      expect(result.llmApiKey).toBe('not-needed');
    });

    it('should accept full config', () => {
      const config = {
        name: 'assistant',
        description: 'My assistant',
        enabled: false,
        llmBaseUrl: 'http://localhost:3000/v1',
        llmApiKey: 'sk-test',
        model: 'gpt-5',
        systemPrompt: 'Be helpful',
      };
      expect(WebhookConfigSchema.parse(config)).toMatchObject(config);
    });

    it('should reject config without name', () => {
      expect(() => WebhookConfigSchema.parse({})).toThrow();
    });
  });
});

