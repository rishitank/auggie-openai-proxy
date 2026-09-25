/**
 * Tests for services/context.ts
 *
 * Verifies context service functionality for codebase indexing
 */

import { ContextService, getContextService, initializeContextService } from './context';
import { constants as fsConstants, type Stats } from 'node:fs';
import * as fs from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import type { Mock } from 'vitest';

/** The positional FileHandle.read overload used by ContextService */
type PositionalRead = (
  buffer: Buffer,
  offset: number,
  length: number,
  position: number
) => Promise<{ bytesRead: number; buffer: Buffer }>;

/** Minimal FileHandle surface used by ContextService, typed against the Node API */
interface MockFileHandle {
  stat: Mock<() => Promise<Pick<Stats, 'size' | 'isFile'>>>;
  read: Mock<PositionalRead>;
  close: Mock<FileHandle['close']>;
}

/**
 * Create a mock FileHandle. Hoisted so the vi.mock factory below can use it.
 * `read` behaves like a positional pread() over `contents`.
 */
const { createMockFileHandle } = vi.hoisted(() => ({
  createMockFileHandle: (
    options: { size?: number; isFile?: boolean; contents?: string } = {}
  ): MockFileHandle => {
    const source = Buffer.from(options.contents ?? 'file content', 'utf-8');
    return {
      stat: vi.fn<() => Promise<Pick<Stats, 'size' | 'isFile'>>>().mockResolvedValue({
        size: options.size ?? source.byteLength,
        isFile: () => options.isFile ?? true,
      }),
      read: vi.fn<PositionalRead>((buffer, offset, length, position) => {
        const bytesRead = Math.max(0, Math.min(length, source.byteLength - position));
        source.copy(buffer, offset, position, position + bytesRead);
        return Promise.resolve({ bytesRead, buffer });
      }),
      close: vi.fn<FileHandle['close']>().mockResolvedValue(undefined),
    };
  },
}));

/** Queue a mock FileHandle as the result of the next fs.open() call */
const mockNextOpen = (handle: MockFileHandle): void => {
  vi.mocked(fs).open.mockResolvedValueOnce(handle as unknown as Awaited<ReturnType<typeof fs.open>>);
};

/** Files passed to the most recent DirectContext.addToIndex call */
const lastIndexedFiles = async (): Promise<{ path: string; contents: string }[]> => {
  const sdk = await import('@augmentcode/auggie-sdk');
  const createResult = vi.mocked(sdk.DirectContext).create.mock.results.at(-1);
  if (createResult?.type !== 'return') {
    return [];
  }
  const ctx = (await createResult.value) as unknown as MockDirectContext;
  const call = ctx.addToIndex.mock.calls.at(-1) as [{ path: string; contents: string }[]] | undefined;
  return call?.[0] ?? [];
};

/**
 * Mock DirectContext interface matching the actual DirectContext type
 */
interface MockDirectContext {
  addToIndex: ReturnType<typeof vi.fn>;
  search: ReturnType<typeof vi.fn>;
  exportToFile: ReturnType<typeof vi.fn>;
  getIndexedPaths: ReturnType<typeof vi.fn>;
}

/** Create mock directory entry */
const mockDirent = (name: string, isDir: boolean): Awaited<ReturnType<typeof fs.readdir>>[number] =>
  ({ name, isDirectory: () => isDir, isFile: () => !isDir }) as unknown as Awaited<ReturnType<typeof fs.readdir>>[number];

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

// Mock fs module. Workspace files are read through a FileHandle (open, then
// fstat and read on the same handle), never via path-based stat/readFile.
vi.mock('node:fs/promises', () => ({
  access: vi.fn().mockRejectedValue(new Error('File not found')),
  readdir: vi.fn().mockResolvedValue([]),
  open: vi.fn().mockImplementation(() => Promise.resolve(createMockFileHandle())),
}));

describe('services/context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  describe('initializeContextService', () => {
    it('should create and initialize a new context service', async () => {
      const service = await initializeContextService({ enabled: true });

      expect(service).toBeInstanceOf(ContextService);
      expect(service.isReady()).toBe(true);
    });

    it('should create disabled service when enabled is false', async () => {
      const service = await initializeContextService({ enabled: false });

      expect(service).toBeInstanceOf(ContextService);
      expect(service.isReady()).toBe(false);
    });
  });

  describe('ContextService advanced', () => {
    describe('initialize with state file', () => {
      it('should load from existing state file when available', async () => {
        const fsMock = vi.mocked(fs);
        fsMock.access.mockResolvedValueOnce(undefined);

        const service = new ContextService({
          enabled: true,
          stateFile: '/path/to/state.json',
        });
        await service.initialize();

        expect(service.isReady()).toBe(true);
      });

      it('should handle initialization failure gracefully', async () => {
        const sdk = await import('@augmentcode/auggie-sdk');
        const mockedDirectContext = vi.mocked(sdk.DirectContext);
        mockedDirectContext.create.mockRejectedValueOnce(new Error('SDK error'));

        const service = new ContextService({ enabled: true });
        await service.initialize();

        expect(service.isReady()).toBe(false);
      });
    });

    describe('indexWorkspace', () => {
      it('should index files in workspace directory', async () => {
        const fsMock = vi.mocked(fs);
        fsMock.readdir.mockResolvedValueOnce([
          mockDirent('file1.ts', false),
          mockDirent('file2.js', false),
        ]);

        const service = new ContextService({ enabled: true });
        await service.initialize();
        await service.indexWorkspace('/workspace');

        expect(fsMock.readdir).toHaveBeenCalledWith('/workspace', { withFileTypes: true });
      });

      it('should skip excluded directories', async () => {
        const fsMock = vi.mocked(fs);
        fsMock.readdir.mockResolvedValueOnce([
          mockDirent('node_modules', true),
          mockDirent('src', true),
        ]);
        fsMock.readdir.mockResolvedValueOnce([mockDirent('index.ts', false)]);

        const service = new ContextService({ enabled: true });
        await service.initialize();
        await service.indexWorkspace('/workspace');

        // node_modules should be skipped, only src should be traversed
        expect(fsMock.readdir).toHaveBeenCalledTimes(2);
      });

      it('should skip files larger than maxFileSize', async () => {
        const fsMock = vi.mocked(fs);
        fsMock.readdir.mockResolvedValueOnce([mockDirent('large.ts', false)]);
        const handle = createMockFileHandle({ size: 200 * 1024 });
        mockNextOpen(handle);

        const service = new ContextService({ enabled: true, maxFileSize: 100 * 1024 });
        await service.initialize();
        await service.indexWorkspace('/workspace');

        // The size check uses the open handle, and large files are never read
        expect(handle.stat).toHaveBeenCalledTimes(1);
        expect(handle.read).not.toHaveBeenCalled();
        expect(handle.close).toHaveBeenCalledTimes(1);
      });

      it('should skip files with unsupported extensions', async () => {
        const fsMock = vi.mocked(fs);
        fsMock.readdir.mockResolvedValueOnce([mockDirent('image.png', false)]);

        const service = new ContextService({ enabled: true });
        await service.initialize();
        await service.indexWorkspace('/workspace');

        expect(fsMock.open).not.toHaveBeenCalled();
      });

      it('should handle file read errors gracefully', async () => {
        const fsMock = vi.mocked(fs);
        fsMock.readdir.mockResolvedValueOnce([mockDirent('file.ts', false)]);
        fsMock.open.mockRejectedValueOnce(new Error('Permission denied'));

        const service = new ContextService({ enabled: true });
        await service.initialize();

        // Should not throw
        await expect(service.indexWorkspace('/workspace')).resolves.not.toThrow();
      });

      it('should read file contents through the same handle it checked', async () => {
        const fsMock = vi.mocked(fs);
        fsMock.readdir.mockResolvedValueOnce([mockDirent('ok.ts', false)]);
        const handle = createMockFileHandle({ contents: 'export const x = 1;' });
        mockNextOpen(handle);

        const service = new ContextService({ enabled: true });
        await service.initialize();
        await service.indexWorkspace('/workspace');

        const expectedFlags =
          process.platform === 'win32'
            ? fsConstants.O_RDONLY
            : fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW;
        expect(fsMock.open).toHaveBeenCalledWith('/workspace/ok.ts', expectedFlags);
        expect(handle.stat).toHaveBeenCalledTimes(1);
        expect(handle.read).toHaveBeenCalled();
        expect(handle.close).toHaveBeenCalledTimes(1);
        expect(await lastIndexedFiles()).toEqual([{ path: 'ok.ts', contents: 'export const x = 1;' }]);
      });

      it('should skip a path that is no longer a regular file when opened', async () => {
        const fsMock = vi.mocked(fs);
        fsMock.readdir.mockResolvedValueOnce([mockDirent('swapped.ts', false)]);
        const handle = createMockFileHandle({ isFile: false });
        mockNextOpen(handle);

        const service = new ContextService({ enabled: true });
        await service.initialize();
        await service.indexWorkspace('/workspace');

        expect(handle.read).not.toHaveBeenCalled();
        expect(handle.close).toHaveBeenCalledTimes(1);
      });

      it('should skip a path swapped for a symlink (ELOOP from O_NOFOLLOW)', async () => {
        const fsMock = vi.mocked(fs);
        fsMock.readdir.mockResolvedValueOnce([
          mockDirent('swapped.ts', false),
          mockDirent('ok.ts', false),
        ]);
        fsMock.open.mockRejectedValueOnce(
          Object.assign(new Error('ELOOP: too many symbolic links encountered'), { code: 'ELOOP' })
        );
        mockNextOpen(createMockFileHandle({ contents: 'ok' }));

        const service = new ContextService({ enabled: true });
        await service.initialize();
        await service.indexWorkspace('/workspace');

        expect(await lastIndexedFiles()).toEqual([{ path: 'ok.ts', contents: 'ok' }]);
      });

      it('should skip a file that grew past maxFileSize after it was checked', async () => {
        const fsMock = vi.mocked(fs);
        fsMock.readdir.mockResolvedValueOnce([mockDirent('growing.ts', false)]);
        const handle = createMockFileHandle({ size: 10, contents: 'x'.repeat(200) });
        mockNextOpen(handle);

        const service = new ContextService({ enabled: true, maxFileSize: 100 });
        await service.initialize();
        await service.indexWorkspace('/workspace');

        expect(handle.read).toHaveBeenCalled();
        expect(handle.close).toHaveBeenCalledTimes(1);
        expect(await lastIndexedFiles()).toEqual([]);
      });

      it('should never read more than maxFileSize + 1 bytes from a growing file', async () => {
        const fsMock = vi.mocked(fs);
        fsMock.readdir.mockResolvedValueOnce([mockDirent('growing.ts', false)]);
        const handle = createMockFileHandle({ size: 10, contents: 'x'.repeat(10_000) });
        mockNextOpen(handle);

        const service = new ContextService({ enabled: true, maxFileSize: 100 });
        await service.initialize();
        await service.indexWorkspace('/workspace');

        expect(handle.read).toHaveBeenCalled();
        const requested = handle.read.mock.calls.reduce((sum, [, , length]) => sum + length, 0);
        const bufferSizes = handle.read.mock.calls.map(([buffer]) => buffer.length);
        expect(requested).toBeLessThanOrEqual(101);
        expect(bufferSizes.every((size) => size === 101)).toBe(true);
        expect(await lastIndexedFiles()).toEqual([]);
      });

      it('should index a file exactly at maxFileSize', async () => {
        const fsMock = vi.mocked(fs);
        fsMock.readdir.mockResolvedValueOnce([mockDirent('exact.ts', false)]);
        mockNextOpen(createMockFileHandle({ contents: 'y'.repeat(100) }));

        const service = new ContextService({ enabled: true, maxFileSize: 100 });
        await service.initialize();
        await service.indexWorkspace('/workspace');

        expect(await lastIndexedFiles()).toEqual([{ path: 'exact.ts', contents: 'y'.repeat(100) }]);
      });

      it('should assemble contents delivered across several short reads', async () => {
        const fsMock = vi.mocked(fs);
        fsMock.readdir.mockResolvedValueOnce([mockDirent('chunked.ts', false)]);
        const handle = createMockFileHandle({ contents: 'abcdef' });
        const source = Buffer.from('abcdef');
        handle.read.mockImplementation((buffer, offset, length, position) => {
          // Deliver at most 2 bytes per call, like a slow or interrupted read
          const bytesRead = Math.max(0, Math.min(2, length, source.byteLength - position));
          source.copy(buffer, offset, position, position + bytesRead);
          return Promise.resolve({ bytesRead, buffer });
        });
        mockNextOpen(handle);

        const service = new ContextService({ enabled: true });
        await service.initialize();
        await service.indexWorkspace('/workspace');

        expect(handle.read.mock.calls.length).toBeGreaterThan(1);
        expect(await lastIndexedFiles()).toEqual([{ path: 'chunked.ts', contents: 'abcdef' }]);
      });

      it('should close the file handle even when reading fails', async () => {
        const fsMock = vi.mocked(fs);
        fsMock.readdir.mockResolvedValueOnce([mockDirent('broken.ts', false)]);
        const handle = createMockFileHandle();
        handle.read.mockRejectedValueOnce(new Error('EIO'));
        mockNextOpen(handle);

        const service = new ContextService({ enabled: true });
        await service.initialize();

        await expect(service.indexWorkspace('/workspace')).resolves.toBeUndefined();
        expect(handle.close).toHaveBeenCalledTimes(1);
      });

      it('should save state file after indexing when configured', async () => {
        const fsMock = vi.mocked(fs);
        fsMock.readdir.mockResolvedValueOnce([mockDirent('file.ts', false)]);
        mockNextOpen(createMockFileHandle({ size: 100 }));

        const service = new ContextService({
          enabled: true,
          stateFile: '/path/to/state.json',
        });
        await service.initialize();
        await service.indexWorkspace('/workspace');

        // context should be created (exportToFile is called internally)
        expect(service.isReady()).toBe(true);
      });
    });

    describe('initialize with workspace', () => {
      it('should auto-index workspace when workspaceDir is configured', async () => {
        const fsMock = vi.mocked(fs);
        fsMock.readdir.mockResolvedValueOnce([]);

        const service = new ContextService({
          enabled: true,
          workspaceDir: '/auto/workspace',
        });
        await service.initialize();

        expect(fsMock.readdir).toHaveBeenCalledWith('/auto/workspace', { withFileTypes: true });
      });
    });

    describe('getIndexedPaths error handling', () => {
      it('should return empty array when getIndexedPaths throws', async () => {
        const sdk = await import('@augmentcode/auggie-sdk');
        const mockContext: MockDirectContext = {
          addToIndex: vi.fn(),
          search: vi.fn(),
          exportToFile: vi.fn(),
          getIndexedPaths: vi.fn().mockImplementation(() => {
            throw new Error('Internal error');
          }),
        };
        type CreateFn = typeof sdk.DirectContext.create;
        const mockedDirectContext = vi.mocked(sdk.DirectContext);
        (mockedDirectContext.create as ReturnType<typeof vi.fn<CreateFn>>).mockResolvedValueOnce(mockContext as unknown as Awaited<ReturnType<CreateFn>>);

        const service = new ContextService({ enabled: true });
        await service.initialize();

        const paths = service.getIndexedPaths();

        expect(paths).toEqual([]);
      });
    });

    describe('enhancePrompt error handling', () => {
      it('should return original message when enhancePrompt throws', async () => {
        const sdk = await import('@augmentcode/auggie-sdk');
        const mockContext: MockDirectContext = {
          addToIndex: vi.fn(),
          search: vi.fn().mockRejectedValue(new Error('Search error')),
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
});

