# Naming Conventions

## Files

- Use kebab-case for file names: `chat-handler.ts`, `context-service.ts`
- Test files: `*.test.ts` (co-located with source)
- Type files: `types/index.ts` for shared types

## Code

- **Classes**: PascalCase (`ContextService`, `AugmentService`)
- **Functions**: camelCase (`initializeContextService`, `enhancePrompt`)
- **Constants**: SCREAMING_SNAKE_CASE for true constants (`DEFAULT_MODEL`)
- **Interfaces**: PascalCase, no `I` prefix (`OpenAIMessage`, not `IOpenAIMessage`)
- **Type aliases**: PascalCase (`MessageRole`, `ContentPart`)

## Test Naming

```typescript
describe('services/context', () => {
  describe('ContextService', () => {
    describe('indexWorkspace', () => {
      it('should index files in workspace directory', async () => {
        // ...
      });
    });
  });
});
```

Pattern: `describe('path/to/module')` → `describe('ClassName')` → `describe('methodName')` → `it('should ...')`
