# Code Review Rules

## Pre-Commit Checklist

Before committing, always run:

```bash
npm run check      # typecheck + lint + actionlint
npm run test:coverage  # tests with coverage
```

## Coverage Requirements

- **Minimum threshold**: 80% for lines, statements, and branches
- When adding new code, ensure tests cover the new functionality
- Use `npm run test:coverage` to verify coverage locally before pushing

## ESLint Rules to Watch

This project enforces strict TypeScript ESLint rules:

| Rule | Fix |
|------|-----|
| `@typescript-eslint/explicit-function-return-type` | Add return types to all functions |
| `@typescript-eslint/unbound-method` | Don't pass method references to `expect()` |
| `@typescript-eslint/array-type` | Use `T[]` not `Array<T>` |

## CI/CD Workflow

The CI workflow runs on every push and PR:

1. Security Audit
2. Type Check
3. Lint (ESLint + actionlint)
4. Tests with Coverage (must pass 80% threshold)
5. Build
6. Docker Build

If CI fails, use `/check-pr-build` command to analyze the failure.
