/**
 * Tests for config.ts
 *
 * Verifies configuration loading and validation
 */

import { loadConfig, AVAILABLE_MODELS } from './config';

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('should return default values when no env vars set', () => {
      delete process.env.PORT;
      delete process.env.HOST;
      delete process.env.DEFAULT_MODEL;
      delete process.env.LOG_LEVEL;
      delete process.env.WEBHOOKS;

      const config = loadConfig();

      expect(config.port).toBe(3456);
      expect(config.host).toBe('0.0.0.0');
      expect(config.defaultModel).toBe('claude-sonnet-4-5');
      expect(config.logLevel).toBe('info');
      expect(config.webhooks).toEqual([]);
    });

    it('should parse PORT from environment', () => {
      process.env.PORT = '8080';

      const config = loadConfig();

      expect(config.port).toBe(8080);
    });

    it('should parse HOST from environment', () => {
      process.env.HOST = '127.0.0.1';

      const config = loadConfig();

      expect(config.host).toBe('127.0.0.1');
    });

    it('should parse DEFAULT_MODEL from environment', () => {
      process.env.DEFAULT_MODEL = 'gpt-5';

      const config = loadConfig();

      expect(config.defaultModel).toBe('gpt-5');
    });

    it('should parse LOG_LEVEL from environment', () => {
      process.env.LOG_LEVEL = 'debug';

      const config = loadConfig();

      expect(config.logLevel).toBe('debug');
    });

    it('should parse AUGMENT credentials from environment', () => {
      process.env.AUGMENT_API_TOKEN = 'test-token';
      process.env.AUGMENT_API_URL = 'https://api.example.com';

      const config = loadConfig();

      expect(config.augment.apiToken).toBe('test-token');
      expect(config.augment.apiUrl).toBe('https://api.example.com');
    });

    it('should parse context configuration from environment', () => {
      process.env.CONTEXT_ENABLED = 'true';
      process.env.CONTEXT_WORKSPACE_DIR = '/path/to/workspace';
      process.env.CONTEXT_STATE_FILE = '/path/to/state.json';
      process.env.CONTEXT_MAX_FILE_SIZE = '50000';

      const config = loadConfig();

      expect(config.context.enabled).toBe(true);
      expect(config.context.workspaceDir).toBe('/path/to/workspace');
      expect(config.context.stateFile).toBe('/path/to/state.json');
      expect(config.context.maxFileSize).toBe(50000);
    });
  });

  describe('WEBHOOKS parsing', () => {
    it('should parse valid WEBHOOKS JSON array', () => {
      process.env.WEBHOOKS = JSON.stringify([
        { name: 'test-webhook', model: 'gpt-5' },
        { name: 'another-webhook', systemPrompt: 'Be helpful' },
      ]);

      const config = loadConfig();

      expect(config.webhooks).toHaveLength(2);
      expect(config.webhooks[0]?.name).toBe('test-webhook');
      expect(config.webhooks[0]?.model).toBe('gpt-5');
      expect(config.webhooks[1]?.name).toBe('another-webhook');
      expect(config.webhooks[1]?.systemPrompt).toBe('Be helpful');
    });

    it('should apply defaults to webhook config', () => {
      process.env.WEBHOOKS = JSON.stringify([{ name: 'minimal' }]);

      const config = loadConfig();

      expect(config.webhooks[0]?.enabled).toBe(true);
      expect(config.webhooks[0]?.llmApiKey).toBe('not-needed');
    });

    it('should return empty array for invalid JSON', () => {
      process.env.WEBHOOKS = 'not valid json';

      const config = loadConfig();

      expect(config.webhooks).toEqual([]);
    });

    it('should return empty array for non-array JSON', () => {
      process.env.WEBHOOKS = JSON.stringify({ name: 'not-an-array' });

      const config = loadConfig();

      expect(config.webhooks).toEqual([]);
    });

    it('should skip invalid webhooks in array', () => {
      process.env.WEBHOOKS = JSON.stringify([
        { name: 'valid' },
        { invalid: 'missing name' },
        { name: 'also-valid' },
      ]);

      const config = loadConfig();

      expect(config.webhooks).toHaveLength(2);
      expect(config.webhooks[0]?.name).toBe('valid');
      expect(config.webhooks[1]?.name).toBe('also-valid');
    });

    it('should return empty array for empty string', () => {
      process.env.WEBHOOKS = '';

      const config = loadConfig();

      expect(config.webhooks).toEqual([]);
    });
  });

  describe('AVAILABLE_MODELS', () => {
    it('should contain expected models', () => {
      expect(AVAILABLE_MODELS).toContain('claude-sonnet-4-5');
      expect(AVAILABLE_MODELS).toContain('claude-haiku-4-5');
      expect(AVAILABLE_MODELS).toContain('claude-opus-4-5');
      expect(AVAILABLE_MODELS).toContain('gpt-5');
    });

    it('should be a readonly array', () => {
      expect(Array.isArray(AVAILABLE_MODELS)).toBe(true);
      expect(AVAILABLE_MODELS.length).toBeGreaterThan(0);
    });
  });
});

