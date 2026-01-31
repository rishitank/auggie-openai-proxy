import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node25',
  splitting: false,
  treeshake: true,
  // Use auggie-dev condition for subpath imports resolution during build
  // Append to existing conditions instead of overwriting to preserve defaults like 'import', 'default'
  esbuildOptions(options) {
    options.conditions = [...(options.conditions ?? []), 'auggie-dev'];
  },
});

