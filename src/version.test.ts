/**
 * Tests for version.ts
 *
 * Verifies that version info is correctly read from package.json
 */

import { VERSION, NAME, DESCRIPTION } from './version';

describe('version', () => {
  describe('VERSION', () => {
    it('should be a valid semver string', () => {
      expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('should match package.json version', async () => {
      // Dynamic import to get fresh package.json
      const pkg = await import('../package.json', { with: { type: 'json' } });
      expect(VERSION).toBe(pkg.default.version);
    });
  });

  describe('NAME', () => {
    it('should be the package name', () => {
      expect(NAME).toBe('auggie-openai-proxy');
    });

    it('should match package.json name', async () => {
      const pkg = await import('../package.json', { with: { type: 'json' } });
      expect(NAME).toBe(pkg.default.name);
    });
  });

  describe('DESCRIPTION', () => {
    it('should be a non-empty string', () => {
      expect(DESCRIPTION).toBeTruthy();
      expect(typeof DESCRIPTION).toBe('string');
    });

    it('should match package.json description', async () => {
      const pkg = await import('../package.json', { with: { type: 'json' } });
      expect(DESCRIPTION).toBe(pkg.default.description);
    });
  });
});

