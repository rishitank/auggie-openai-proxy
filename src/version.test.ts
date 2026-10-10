/**
 * Tests for version.ts
 *
 * Verifies that version info is correctly read from package.json
 */

import { VERSION, NAME, DESCRIPTION } from './version';

describe('version', () => {
  describe('VERSION', () => {
    it('should be a valid semver string', () => {
      expect(VERSION).toMatch(/^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/);
    });

    it('should match package.json version', async () => {
      // Dynamic import to get fresh package.json
      const pkg = await import('../package.json', { with: { type: 'json' } });
      expect(VERSION).toBe(pkg.default.version);
    });
  });

  describe('NAME', () => {
    it('should match package.json name', async () => {
      const pkg = await import('../package.json', { with: { type: 'json' } });
      expect(NAME).toBe(pkg.default.name);
    });
  });

  describe('DESCRIPTION', () => {
    it('should be a string', () => {
      expect(typeof DESCRIPTION).toBe('string');
    });

    it('should match package.json description', async () => {
      const pkg = await import('../package.json', { with: { type: 'json' } });
      expect(DESCRIPTION).toBe(pkg.default.description);
    });
  });

  describe('when package.json cannot be read', () => {
    afterEach(() => {
      vi.doUnmock('node:fs');
      vi.resetModules();
    });

    it('rethrows with the original error attached as cause', async () => {
      const readError = new Error('ENOENT: no such file or directory');
      vi.resetModules();
      vi.doMock('node:fs', () => ({
        readFileSync: (): never => {
          throw readError;
        },
      }));

      await expect(import('./version')).rejects.toMatchObject({
        message: `Failed to load package.json: ${readError.message}`,
        cause: readError,
      });
    });
  });
});
