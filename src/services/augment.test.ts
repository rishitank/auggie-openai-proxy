/**
 * Tests for services/augment.ts
 *
 * Verifies Augment SDK service functionality
 */

import { AugmentService, getAugmentService } from './augment';
import { MessageRole } from '@types';

// Mock the Auggie SDK
vi.mock('@augmentcode/auggie-sdk', () => ({
  AugmentLanguageModel: vi.fn().mockImplementation(() => ({
    doGenerate: vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Generated response' }],
      usage: { inputTokens: 10, outputTokens: 20 },
    }),
    doStream: vi.fn().mockResolvedValue({
      stream: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: { type: 'text-delta', delta: 'Hello' } })
            .mockResolvedValueOnce({ done: false, value: { type: 'text-delta', delta: ' world' } })
            .mockResolvedValueOnce({ done: true }),
          releaseLock: vi.fn(),
        }),
      },
    }),
  })),
  resolveAugmentCredentials: vi.fn().mockResolvedValue({
    apiKey: 'test-api-key',
    apiUrl: 'https://api.augment.com',
  }),
}));

// Mock config
vi.mock('@config', () => ({
  AVAILABLE_MODELS: ['claude-sonnet-4-5', 'gpt-5'],
}));

describe('services/augment', () => {
  describe('AugmentService', () => {
    let service: AugmentService;

    beforeEach(() => {
      service = new AugmentService();
    });

    describe('initialize', () => {
      it('should initialize with environment variables', async () => {
        await service.initialize('env-token', 'https://env.api.com');

        expect(service.isInitialized).toBe(true);
      });

      it('should fall back to session file when env vars not provided', async () => {
        await service.initialize(undefined, undefined);

        expect(service.isInitialized).toBe(true);
      });

      it('should fall back to session file when env vars are empty', async () => {
        await service.initialize('', '');

        expect(service.isInitialized).toBe(true);
      });
    });

    describe('generateCompletion', () => {
      beforeEach(async () => {
        await service.initialize('token', 'https://api.com');
      });

      it('should generate completion from messages', async () => {
        const messages = [{ role: MessageRole.User, content: 'Hello' }];

        const result = await service.generateCompletion(messages, 'claude-sonnet-4-5');

        expect(result.text).toBe('Generated response');
        expect(result.usage).toEqual({ promptTokens: 10, completionTokens: 20 });
      });

      it('should throw if not initialized', async () => {
        const uninitializedService = new AugmentService();
        const messages = [{ role: MessageRole.User, content: 'Hello' }];

        await expect(
          uninitializedService.generateCompletion(messages, 'claude-sonnet-4-5')
        ).rejects.toThrow('not initialized');
      });
    });

    describe('streamCompletion', () => {
      beforeEach(async () => {
        await service.initialize('token', 'https://api.com');
      });

      it('should stream completion chunks', async () => {
        const messages = [{ role: MessageRole.User, content: 'Hello' }];
        const chunks: string[] = [];

        for await (const chunk of service.streamCompletion(messages, 'claude-sonnet-4-5')) {
          chunks.push(chunk);
        }

        expect(chunks).toEqual(['Hello', ' world']);
      });
    });

    describe('getAvailableModels', () => {
      it('should return available models', () => {
        const models = service.getAvailableModels();

        expect(models).toContain('claude-sonnet-4-5');
        expect(models).toContain('gpt-5');
      });
    });
  });

  describe('getAugmentService', () => {
    it('should return singleton instance', () => {
      const service1 = getAugmentService();
      const service2 = getAugmentService();

      expect(service1).toBe(service2);
    });

    it('should return AugmentService instance', () => {
      const service = getAugmentService();

      expect(service).toBeInstanceOf(AugmentService);
    });
  });
});

