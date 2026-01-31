# Git Workflow Rules

## Commit Guidelines

- Use conventional commit format: `type(scope): description`
- Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`, `ci`
- Keep commits atomic and focused
- Write meaningful commit messages

## Branch Strategy

- `main` - production-ready code
- `develop` - integration branch (if used)
- `feature/*` - new features
- `fix/*` - bug fixes
- `hotfix/*` - urgent production fixes

## Forbidden Actions

**NEVER do these on pushed commits:**

1. **No `--amend`** - Creates new commit instead
2. **No `--force` push** - Use `--force-with-lease` only if absolutely necessary
3. **No rewriting public history** - Only rebase unpushed commits

## Pull Request Best Practices

- Keep PRs focused and reasonably sized
- Run all checks before creating PR
- Write descriptive PR titles and descriptions
- Link related issues
- Request appropriate reviewers

## Pre-commit Checks

Always run before committing:

```bash
npm run check         # typecheck + lint + actionlint
npm run test:coverage # tests with coverage (must pass 80% threshold)
```

## CI Failure Debugging

When CI fails on a PR:

1. Use `/check-pr-build` command to analyze the failure
2. Common failures:
   - **Coverage threshold**: Add tests to reach 80% coverage
   - **ESLint errors**: Fix type annotations, array syntax
   - **TypeScript errors**: Check mock types, subpath imports
3. Fix locally, commit, and push (never amend pushed commits)

## GitHub Actions

- Workflow files are in `.github/workflows/`
- Use `actionlint` to validate workflows locally: `npm run lint:workflows`
- Keep action versions up to date (e.g., `actions/checkout@v4`, `actions/upload-artifact@v6`)
