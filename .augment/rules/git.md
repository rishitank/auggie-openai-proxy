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
npm run check  # typecheck + lint
npm run test   # run tests
```
