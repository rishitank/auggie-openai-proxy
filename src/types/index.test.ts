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
} from './index';

describe('types', () => {
  describe('Enums', () => {
    it('should have correct MessageRole values', () => {
      expect(MessageRole.System).toBe('system');
      expect(MessageRole.User).toBe('user');
      expect(MessageRole.Assistant).toBe('assistant');
    });

    it('should have correct ContentType values', () => {
      expect(ContentType.Text).toBe('text');
    });

    it('should have correct FinishReason values', () => {
      expect(FinishReason.Stop).toBe('stop');
      expect(FinishReason.Length).toBe('length');
    });
  });

  describe('MessageRoleSchema', () => {
    it('should accept valid roles', () => {
      expect(MessageRoleSchema.parse('system')).toBe('system');
      expect(MessageRoleSchema.parse('user')).toBe('user');
      expect(MessageRoleSchema.parse('assistant')).toBe('assistant');
    });

    it('should reject invalid roles', () => {
      expect(() => MessageRoleSchema.parse('invalid')).toThrow();
      expect(() => MessageRoleSchema.parse('')).toThrow();
    });
  });

  describe('OpenAIMessageSchema', () => {
    it('should accept valid messages', () => {
      const msg = { role: 'user', content: 'Hello' };
      const result = OpenAIMessageSchema.parse(msg);
      expect(result.role).toBe('user');
      expect(result.content).toBe('Hello');
    });

    it('should reject missing role', () => {
      expect(() => OpenAIMessageSchema.parse({ content: 'Hello' })).toThrow();
    });

    it('should reject missing content', () => {
      expect(() => OpenAIMessageSchema.parse({ role: 'user' })).toThrow();
    });
  });

  describe('ChatCompletionRequestSchema', () => {
    it('should accept valid request with defaults', () => {
      const req = { messages: [{ role: 'user', content: 'Hello' }] };
      const result = ChatCompletionRequestSchema.parse(req);
      expect(result.model).toBe('claude-sonnet-4-5');
      expect(result.stream).toBe(false);
      expect(result.messages).toHaveLength(1);
    });

    it('should accept request with all fields', () => {
      const req = {
        model: 'gpt-5',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: true,
        temperature: 0.7,
        max_tokens: 100,
      };
      const result = ChatCompletionRequestSchema.parse(req);
      expect(result.model).toBe('gpt-5');
      expect(result.stream).toBe(true);
      expect(result.temperature).toBe(0.7);
      expect(result.max_tokens).toBe(100);
    });

    it('should reject empty messages array', () => {
      expect(() => ChatCompletionRequestSchema.parse({ messages: [] })).toThrow();
    });

    it('should reject invalid temperature', () => {
      const req = { messages: [{ role: 'user', content: 'Hi' }], temperature: 3 };
      expect(() => ChatCompletionRequestSchema.parse(req)).toThrow();
    });
  });

  describe('WebhookRequestSchema', () => {
    it('should accept request with text field', () => {
      const result = WebhookRequestSchema.parse({ text: 'Hello' });
      expect(result.text).toBe('Hello');
    });

    it('should accept request with prompt field', () => {
      const result = WebhookRequestSchema.parse({ prompt: 'Hello' });
      expect(result.prompt).toBe('Hello');
    });

    it('should accept request with message field', () => {
      const result = WebhookRequestSchema.parse({ message: 'Hello' });
      expect(result.message).toBe('Hello');
    });

    it('should accept IFTTT format with value1', () => {
      const result = WebhookRequestSchema.parse({ value1: 'Hello' });
      expect(result.value1).toBe('Hello');
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

    it('should reject request with no message fields', () => {
      expect(() => WebhookRequestSchema.parse({})).toThrow();
      expect(() => WebhookRequestSchema.parse({ model: 'gpt-5' })).toThrow();
    });
  });

  describe('WebhookConfigSchema', () => {
    it('should accept minimal config', () => {
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
      const result = WebhookConfigSchema.parse(config);
      expect(result).toMatchObject(config);
    });

    it('should reject config without name', () => {
      expect(() => WebhookConfigSchema.parse({})).toThrow();
    });
  });
});

