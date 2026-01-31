# TypeScript Rules

## General Guidelines

- Use modern ES6+ syntax (arrow functions, const/let, template literals)
- Prefer `readonly T[]` over `ReadonlyArray<T>` and `T[]` over `Array<T>`
- Use explicit return types on functions to satisfy `@typescript-eslint/explicit-function-return-type`

## Mocking Node.js Types in Tests

When mocking Node.js types like `Dirent`, `Stats`, etc., use the double-cast pattern through `unknown`:

```typescript
// ✅ Good - double cast through unknown
const mockDirent = (name: string, isDir: boolean): Awaited<ReturnType<typeof fs.readdir>>[number] =>
  ({ name, isDirectory: () => isDir, isFile: () => !isDir }) as unknown as Awaited<ReturnType<typeof fs.readdir>>[number];

// ❌ Bad - verbose ES5-style function with all properties
function createMockDirent(name: string, isDir: boolean): Dirent {
  return {
    name,
    isDirectory: (): boolean => isDir,
    isFile: (): boolean => !isDir,
    isBlockDevice: (): boolean => false,
    // ... many more properties
  };
}
```

## Vitest/Jest Mocking

- Mock paths must match actual import paths (use `#services/foo` for subpath imports, not `@services/foo`)
- Use `vi.mocked()` for type-safe access to mocked functions
- Add `vi.clearAllMocks()` in `beforeEach` to prevent mock state bleeding between tests
- Avoid `@typescript-eslint/unbound-method` errors by testing method results, not method references:

```typescript
// ✅ Good - test the result
expect(service.isReady()).toBe(true);

// ❌ Bad - unbound method reference
expect(sdk.DirectContext.create).toHaveBeenCalled();
```

## Subpath Imports

This project uses Node.js subpath imports defined in `package.json`:

```json
{
  "imports": {
    "#config": "./src/config.ts",
    "#services/*": "./src/services/*.ts"
  }
}
```

- Use `#` prefix for internal imports: `import { config } from '#config'`
- Mock paths must use `#` prefix: `vi.mock('#services/augment', ...)`
