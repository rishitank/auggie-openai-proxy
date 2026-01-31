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
  esbuildOptions(options) {
    options.conditions = ['auggie-dev'];
  },
});

