/**
 * Tests for services/context.ts
 *
 * Verifies context service functionality for codebase indexing
 */

import { ContextService, getContextService } from './context';

/**
 * Mock DirectContext interface matching the actual DirectContext type
 */
interface MockDirectContext {
  addToIndex: ReturnType<typeof vi.fn>;
  search: ReturnType<typeof vi.fn>;
  exportToFile: ReturnType<typeof vi.fn>;
  getIndexedPaths: ReturnType<typeof vi.fn>;
}

// Mock the Auggie SDK DirectContext
vi.mock('@augmentcode/auggie-sdk', () => ({
  DirectContext: {
    create: vi.fn().mockResolvedValue({
      addToIndex: vi.fn().mockResolvedValue({ newlyUploaded: [] }),
      search: vi.fn().mockResolvedValue('Found code snippet'),
      exportToFile: vi.fn().mockResolvedValue(undefined),
      getIndexedPaths: vi.fn().mockReturnValue(['/file1.ts', '/file2.ts']),
    }),
    importFromFile: vi.fn().mockResolvedValue({
      addToIndex: vi.fn().mockResolvedValue({ newlyUploaded: [] }),
      search: vi.fn().mockResolvedValue('Found code snippet'),
      exportToFile: vi.fn().mockResolvedValue(undefined),
      getIndexedPaths: vi.fn().mockReturnValue(['/file1.ts', '/file2.ts']),
    }),
  },
}));

// Mock fs module
vi.mock('node:fs/promises', () => ({
  access: vi.fn().mockRejectedValue(new Error('File not found')),
  readdir: vi.fn().mockResolvedValue([]),
  stat: vi.fn().mockResolvedValue({ size: 1000 }),
  readFile: vi.fn().mockResolvedValue('file content'),
}));

describe('services/context', () => {
  describe('ContextService', () => {
    describe('constructor', () => {
      it('should apply default config values', () => {
        const service = new ContextService();

        expect(service.isReady()).toBe(false);
      });

      it('should accept custom config', () => {
        const service = new ContextService({
          enabled: true,
          workspaceDir: '/custom/path',
          maxFileSize: 50000,
        });

        expect(service.isReady()).toBe(false); // Not initialized yet
      });
    });

    describe('initialize', () => {
      it('should not initialize when disabled', async () => {
        const service = new ContextService({ enabled: false });

        await service.initialize();

        expect(service.isReady()).toBe(false);
      });

      it('should initialize when enabled', async () => {
        const service = new ContextService({ enabled: true });

        await service.initialize();

        expect(service.isReady()).toBe(true);
      });
    });

    describe('isReady', () => {
      it('should return false before initialization', () => {
        const service = new ContextService({ enabled: true });

        expect(service.isReady()).toBe(false);
      });

      it('should return true after successful initialization', async () => {
        const service = new ContextService({ enabled: true });
        await service.initialize();

        expect(service.isReady()).toBe(true);
      });
    });

    describe('search', () => {
      it('should return null when not initialized', async () => {
        const service = new ContextService({ enabled: true });

        const result = await service.search('test query');

        expect(result).toBeNull();
      });

      it('should return search results when initialized', async () => {
        const service = new ContextService({ enabled: true });
        await service.initialize();

        const result = await service.search('test query');

        expect(result).toBe('Found code snippet');
      });
    });

    describe('enhancePrompt', () => {
      it('should return original message when not initialized', async () => {
        const service = new ContextService({ enabled: true });

        const result = await service.enhancePrompt('Hello');

        expect(result).toBe('Hello');
      });

      it('should enhance message with context when initialized', async () => {
        const service = new ContextService({ enabled: true });
        await service.initialize();

        const result = await service.enhancePrompt('Hello');

        expect(result).toContain('Found code snippet');
        expect(result).toContain('Hello');
      });
    });

    describe('getIndexedPaths', () => {
      it('should return empty array when not initialized', () => {
        const service = new ContextService({ enabled: true });

        const paths = service.getIndexedPaths();

        expect(paths).toEqual([]);
      });

      it('should return indexed paths when initialized', async () => {
        const service = new ContextService({ enabled: true });
        await service.initialize();

        const paths = service.getIndexedPaths();

        expect(paths).toContain('/file1.ts');
        expect(paths).toContain('/file2.ts');
      });
    });

    describe('indexWorkspace', () => {
      it('should throw if not initialized', async () => {
        const service = new ContextService({ enabled: true });

        await expect(service.indexWorkspace('/path')).rejects.toThrow('not initialized');
      });
    });

    describe('search error handling', () => {
      it('should return null when search throws', async () => {
        const sdk = await import('@augmentcode/auggie-sdk');
        const mockContext: MockDirectContext = {
          addToIndex: vi.fn(),
          search: vi.fn().mockRejectedValue(new Error('Search failed')),
          exportToFile: vi.fn(),
          getIndexedPaths: vi.fn().mockReturnValue([]),
        };
        type CreateFn = typeof sdk.DirectContext.create;
        const mockedDirectContext = vi.mocked(sdk.DirectContext);
        (mockedDirectContext.create as ReturnType<typeof vi.fn<CreateFn>>).mockResolvedValueOnce(mockContext as unknown as Awaited<ReturnType<CreateFn>>);

        const service = new ContextService({ enabled: true });
        await service.initialize();

        const result = await service.search('test');

        // When search throws, it returns null
        expect(result).toBeNull();
      });
    });

    describe('enhancePrompt edge cases', () => {
      it('should return original message when search returns empty string', async () => {
        const sdk = await import('@augmentcode/auggie-sdk');
        const mockContext: MockDirectContext = {
          addToIndex: vi.fn(),
          search: vi.fn().mockResolvedValue('  '),
          exportToFile: vi.fn(),
          getIndexedPaths: vi.fn().mockReturnValue([]),
        };
        type CreateFn = typeof sdk.DirectContext.create;
        const mockedDirectContext = vi.mocked(sdk.DirectContext);
        (mockedDirectContext.create as ReturnType<typeof vi.fn<CreateFn>>).mockResolvedValueOnce(mockContext as unknown as Awaited<ReturnType<CreateFn>>);

        const service = new ContextService({ enabled: true });
        await service.initialize();

        const result = await service.enhancePrompt('Hello');

        expect(result).toBe('Hello');
      });
    });
  });

  describe('getContextService', () => {
    it('should return singleton instance', () => {
      const service1 = getContextService();
      const service2 = getContextService();

      expect(service1).toBe(service2);
    });

    it('should return ContextService instance', () => {
      const service = getContextService();

      expect(service).toBeInstanceOf(ContextService);
    });
  });
});

