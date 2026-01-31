import { defineConfig } from 'vitest/config';
import path from 'node:path';
import fs from 'node:fs';

// Read subpath imports from package.json to avoid duplication
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const imports: Record<string, { 'auggie-dev': string; default: string }> = pkg.imports ?? {};

// Build a custom resolver that emulates ESM-style subpath imports
function matchIdentifier(id: string, pattern: string): { match: boolean; capture?: string } {
  const regexp = new RegExp(`^${pattern.replace('*', '(.*)')}$`);
  const match = id.match(regexp);
  return { match: !!match, capture: match?.[1] };
}

export default defineConfig({
  resolve: {
    alias: [
      {
        // Match all #-prefixed imports and resolve using package.json imports
        find: /^#/,
        replacement: '#',
        customResolver(id) {
          for (const [pattern, mapping] of Object.entries(imports)) {
            const { match, capture } = matchIdentifier(id, pattern);
            if (match) {
              // Use the 'auggie-dev' condition for development/testing
              const replacement = mapping['auggie-dev'];
              const resolved = path.resolve(
                capture ? replacement.replace('*', capture) : replacement
              );
              return resolved;
            }
          }
          return null;
        },
      },
    ],
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/types/**',
        'src/index.ts', // Entry point with side effects
        'src/handlers/index.ts', // Barrel file (re-exports only)
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});

