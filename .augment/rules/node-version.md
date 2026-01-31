# Node.js Version Rules

## Required Version

This project uses **Node.js 24** with native TypeScript support (no transpilation needed).

## Native TypeScript Execution

- Run TypeScript directly: `node --experimental-strip-types src/index.ts`
- No `tsx` or `ts-node` required
- Subpath imports require `--conditions` flag in some contexts

## Package.json Configuration

```json
{
  "type": "module",
  "engines": {
    "node": ">=24.0.0"
  },
  "imports": {
    "#config": "./src/config.ts",
    "#services/*": "./src/services/*.ts",
    "#handlers/*": "./src/handlers/*.ts"
  }
}
```

## Build Configuration

For production builds, use `tsup` with esbuild conditions:

```typescript
// tsup.config.ts
export default defineConfig({
  esbuildOptions(options) {
    options.conditions = ['node', 'import'];
  },
});
```
