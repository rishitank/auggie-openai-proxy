/**
 * Context Service
 *
 * Single Responsibility: Manages codebase context indexing and search
 * Uses DirectContext from Auggie SDK for API-based indexing
 *
 * Features:
 * - Index workspace files for context-aware prompts
 * - Search for relevant code snippets
 * - Persist index state to avoid re-indexing
 * - Enhance prompts with codebase context
 */

import { DirectContext } from '@augmentcode/auggie-sdk';
import { constants as fsConstants } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/** File to be indexed */
interface IndexFile {
  readonly path: string;
  readonly contents: string;
}

/**
 * Flags for opening workspace files: read-only and, where the platform has it,
 * O_NOFOLLOW so open() fails with ELOOP if the final path component has been
 * swapped for a symlink since readdir() reported a regular file.
 */
const READ_NO_FOLLOW =
  process.platform === 'win32'
    ? fsConstants.O_RDONLY
    : fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW;

/**
 * Read a regular file if it is no larger than `maxBytes`.
 *
 * The file is opened once and every check goes through that handle (fstat,
 * then read), so the check and the read always refer to the same file. The
 * previous path-based stat() followed by readFile() let the path be replaced
 * between the two calls (CWE-367, time-of-check to time-of-use).
 *
 * The size is re-checked on the bytes actually read, in case the file grew
 * after fstat.
 *
 * @returns the UTF-8 contents, or null if the path is not a regular file or
 *   exceeds the limit. Errors from open/read (missing file, EACCES, ELOOP)
 *   propagate to the caller.
 */
const readFileWithinLimit = async (filePath: string, maxBytes: number): Promise<string | null> => {
  const handle = await fs.open(filePath, READ_NO_FOLLOW);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > maxBytes) {
      return null;
    }
    const data = await handle.readFile();
    if (data.byteLength > maxBytes) {
      return null;
    }
    return data.toString('utf-8');
  } finally {
    await handle.close();
  }
};

/** Context service configuration */
interface ContextServiceConfig {
  readonly workspaceDir?: string;
  readonly stateFile?: string;
  readonly enabled: boolean;
  readonly fileExtensions: readonly string[];
  readonly excludePatterns: readonly string[];
  readonly maxFileSize: number;
}

/**
 * Context Service for codebase indexing and search
 */
export class ContextService {
  private context: DirectContext | null = null;
  private initialized = false;
  private readonly config: ContextServiceConfig;

  constructor(config: Partial<ContextServiceConfig> = {}) {
    this.config = {
      workspaceDir: config.workspaceDir,
      stateFile: config.stateFile,
      enabled: config.enabled ?? false,
      fileExtensions: config.fileExtensions ?? [
        '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
        '.py', '.rb', '.go', '.rs', '.java', '.kt',
        '.c', '.cpp', '.h', '.hpp', '.cs',
        '.json', '.yaml', '.yml', '.toml', '.md',
      ],
      excludePatterns: config.excludePatterns ?? [
        'node_modules', 'dist', 'build', '.git', '__pycache__',
        'coverage', '.next', '.nuxt', 'vendor',
      ],
      maxFileSize: config.maxFileSize ?? 100 * 1024, // 100KB default
    };
  }

  /**
   * Initialize the context service
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      console.log('[Context] Context enhancement disabled');
      return;
    }

    try {
      // Try to load existing state first
      const stateFile = this.config.stateFile;
      if (stateFile !== undefined && stateFile !== '') {
        try {
          await fs.access(stateFile);
          this.context = await DirectContext.importFromFile(stateFile);
          this.initialized = true;
          console.log(`[Context] Loaded existing index from ${stateFile}`);
          return;
        } catch {
          // State file doesn't exist, will create new context
        }
      }

      // Create new context
      this.context = await DirectContext.create();
      this.initialized = true;
      console.log('[Context] Created new context');

      // Index workspace if configured
      const workspaceDir = this.config.workspaceDir;
      if (workspaceDir !== undefined && workspaceDir !== '') {
        await this.indexWorkspace(workspaceDir);
      }
    } catch (error) {
      console.error('[Context] Failed to initialize:', error);
      this.initialized = false;
    }
  }

  /**
   * Index all files in a workspace directory
   */
  async indexWorkspace(workspaceDir: string): Promise<void> {
    if (!this.context) {
      throw new Error('Context not initialized');
    }

    console.log(`[Context] Indexing workspace: ${workspaceDir}`);
    const files = await this.collectFiles(workspaceDir);

    if (files.length === 0) {
      console.log('[Context] No files to index');
      return;
    }

    console.log(`[Context] Found ${String(files.length)} files to index`);

    const result = await this.context.addToIndex(files, {
      onProgress: (progress) => {
        if (progress.stage === 'indexing') {
          console.log(`[Context] Indexed: ${String(progress.indexed)}/${String(progress.total)}`);
        }
      },
    });

    console.log(`[Context] Indexed ${String(result.newlyUploaded.length)} new files`);

    // Save state if configured
    const stateFile = this.config.stateFile;
    if (stateFile !== undefined && stateFile !== '') {
      await this.context.exportToFile(stateFile);
      console.log(`[Context] Saved index to ${stateFile}`);
    }
  }

  /**
   * Collect files from a directory recursively
   */
  private async collectFiles(dir: string, basePath = ''): Promise<IndexFile[]> {
    const files: IndexFile[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name);

      // Skip excluded patterns
      if (this.config.excludePatterns.some((p) => entry.name.includes(p))) {
        continue;
      }

      if (entry.isDirectory()) {
        const subFiles = await this.collectFiles(fullPath, relativePath);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (this.config.fileExtensions.includes(ext)) {
          try {
            const contents = await readFileWithinLimit(fullPath, this.config.maxFileSize);
            if (contents !== null) {
              files.push({ path: relativePath, contents });
            }
          } catch {
            // Skip files that can't be opened or read (removed, EACCES, or
            // ELOOP because the path was swapped for a symlink)
          }
        }
      }
    }

    return files;
  }

  /**
   * Search for relevant code context
   */
  async search(query: string): Promise<string | null> {
    if (!this.initialized || !this.context) {
      return null;
    }

    try {
      const results = await this.context.search(query);
      return results;
    } catch (error) {
      console.error('[Context] Search failed:', error);
      return null;
    }
  }

  /**
   * Enhance a user message with relevant codebase context
   * Returns the enhanced message or the original if no context found
   */
  async enhancePrompt(userMessage: string): Promise<string> {
    if (!this.initialized || !this.context) {
      return userMessage;
    }

    try {
      const context = await this.search(userMessage);
      if (context !== null && context.trim() !== '') {
        return `Here is relevant context from the codebase:\n\n${context}\n\n---\n\nUser request: ${userMessage}`;
      }
    } catch (error) {
      console.error('[Context] Failed to enhance prompt:', error);
    }

    return userMessage;
  }

  /**
   * Check if context service is ready
   */
  isReady(): boolean {
    return this.initialized && this.context !== null;
  }

  /**
   * Get indexed file count (if available)
   */
  getIndexedPaths(): string[] {
    if (!this.context) {
      return [];
    }
    try {
      return this.context.getIndexedPaths();
    } catch {
      return [];
    }
  }
}

// Singleton instance
let contextServiceInstance: ContextService | null = null;

/**
 * Get or create the ContextService singleton
 */
export const getContextService = (): ContextService => {
  contextServiceInstance ??= new ContextService();
  return contextServiceInstance;
};

/**
 * Initialize the context service with configuration
 */
export const initializeContextService = async (
  config: Partial<ContextServiceConfig>
): Promise<ContextService> => {
  contextServiceInstance = new ContextService(config);
  await contextServiceInstance.initialize();
  return contextServiceInstance;
};

