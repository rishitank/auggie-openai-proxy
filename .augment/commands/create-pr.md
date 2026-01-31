---
description: Automate PR creation with GitHub best practices
argument-hint: "[base-branch] (optional, auto-detects parent branch)"
---

# Create Pull Request

Automate the entire PR creation process following GitHub best practices.

## Arguments

- `$ARGUMENTS`: Optional base branch name. If not provided, auto-detects the appropriate base branch.

## Workflow

### 1. Pre-flight Checks

Run these checks before proceeding:

```bash
# Verify we're not on main/develop
git branch --show-current

# Check for uncommitted changes
git status --porcelain

# Verify branch is pushed to remote
git rev-parse --abbrev-ref --symbolic-full-name @{u}
```

**Stop if:**
- Current branch is `main` or `develop` (cannot create PR from protected branches)
- There are uncommitted changes (prompt user to commit or stash)
- Branch is not pushed to remote (push it first)

### 2. Determine Base Branch

If `$ARGUMENTS` is empty, determine the base branch:

1. Check if current branch was created from another feature branch
2. Look for common patterns:
   - `feature/*` branches → base on `main` or `develop`
   - `fix/*` branches → base on `main`
   - `hotfix/*` branches → base on `main`
   - Nested feature branches (e.g., `feature/foo-bar` from `feature/foo`) → base on parent
3. Use `git log --oneline main..HEAD` to verify commits exist

### 3. Validate Branch State

```bash
# Ensure branch is up to date with base
git fetch origin
git log --oneline origin/<base>..HEAD

# Check if base branch has new commits
git log --oneline HEAD..origin/<base>
```

**If base has new commits:** Inform user they may want to rebase/merge before creating PR.

### 4. Run Quality Checks

Execute all quality gates:

```bash
npm run check      # typecheck + lint
npm run test       # run tests
npm run build      # verify build works
```

**Stop if any check fails.** Fix issues before creating PR.

### 5. Analyze Commits for PR Content

```bash
# Get all commits for this branch
git log --oneline origin/<base>..HEAD

# Get detailed commit messages
git log --format="%s%n%n%b" origin/<base>..HEAD
```

Parse commits to:
- Extract PR title from first/primary commit or branch name
- Group changes by type (feat, fix, chore, docs, refactor, test)
- Identify breaking changes (commits with `!` or `BREAKING CHANGE`)

### 6. Generate PR Title

Follow conventional commit format for PR title:

- Use the primary feature/fix as the title
- Format: `type(scope): description`
- Examples:
  - `feat(webhooks): add named webhook system`
  - `fix(api): resolve timeout issues`
  - `chore(ci): add GitHub Actions workflows`

If multiple types, use the most significant one.

### 7. Generate PR Description

Create a comprehensive PR description using this template:

```markdown
## Summary

[One paragraph describing what this PR does and why]

## Changes

### Added
- [New features or capabilities]

### Changed
- [Modifications to existing functionality]

### Fixed
- [Bug fixes]

### Removed
- [Removed features or code]

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] CI/CD changes

## Testing

- [ ] Tests pass locally (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)

## Checklist

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code where necessary
- [ ] I have updated documentation as needed
- [ ] My changes generate no new warnings
- [ ] New and existing tests pass

---
Pull Request created by [Augment Code](https://www.augmentcode.com/)
```

### 8. Check for Existing PR

```bash
# Use GitHub API to check for existing PRs from this branch
gh pr list --head <current-branch> --state open
```

If PR exists, ask user if they want to update it instead.

### 9. Create the Pull Request

Use GitHub API to create the PR:

```json
POST /repos/{owner}/{repo}/pulls
{
  "title": "<generated-title>",
  "head": "<current-branch>",
  "base": "<base-branch>",
  "body": "<generated-description>",
  "draft": false
}
```

### 10. Post-Creation Actions

After PR is created:

1. **Add Labels** (if applicable):
   - `enhancement` for features
   - `bug` for fixes
   - `documentation` for docs
   - `dependencies` for dependency updates

2. **Request Reviewers** (if configured):
   - Check CODEOWNERS file
   - Suggest reviewers based on changed files

3. **Link Issues** (if applicable):
   - Parse commit messages for issue references (`#123`, `fixes #123`)
   - Add to PR description

### 11. Output Summary

Display:
- PR URL
- PR number
- Title
- Base ← Head branches
- Number of commits
- Files changed
- Any warnings or suggestions

## Git Workflow Rules

**IMPORTANT:** Follow these rules strictly:

1. **Never use `--amend` on pushed commits**
2. **Never use `--force` push**
3. **Always use conventional commit format**
4. **Run all checks before creating PR**
5. **Keep PRs focused and reasonably sized**

## Error Handling

| Error | Action |
| --- | --- |
| Uncommitted changes | Prompt to commit or stash |
| Branch not pushed | Push branch first |
| Quality checks fail | Stop and show errors |
| PR already exists | Offer to update existing PR |
| No commits vs base | Abort - nothing to PR |
| API rate limit | Wait and retry |

## Examples

```bash
# Auto-detect base branch
/create-pr

# Specify base branch explicitly
/create-pr main

# Create PR to feature branch
/create-pr feature/parent-feature
```

