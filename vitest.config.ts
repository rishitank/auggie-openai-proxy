import { defineConfig } from 'vitest/config';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Use import.meta.url for CWD-independent path resolution (works in monorepos)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read subpath imports from package.json to avoid duplication
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const imports: Record<string, { 'auggie-dev': string; default: string }> = pkg.imports ?? {};

// Build a custom resolver that emulates ESM-style subpath imports
const matchIdentifier = (id: string, pattern: string): { match: boolean; capture?: string } => {
  // Use replaceAll to handle all occurrences (satisfies CodeQL security check)
  const regexp = new RegExp(`^${pattern.replaceAll('*', '(.*)')}$`);
  const match = id.match(regexp);
  return { match: !!match, capture: match?.[1] };
};

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
                // Use replaceAll to handle all occurrences (satisfies CodeQL security check)
                capture ? replacement.replaceAll('*', capture) : replacement
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
        'src/test-utils.ts', // Test utilities (not production code)
        'src/types/**',
        'src/index.ts', // Entry point with side effects
        'src/handlers/index.ts', // Barrel file (re-exports only)
      ],
      thresholds: {
        statements: 80,
        branches: 75, // Lowered from 80% due to Vitest 4 coverage calculation changes
        functions: 80,
        lines: 80,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});

