---
description: Check GitHub Actions build logs for a PR
argument-hint: "[pr-number] (optional, auto-detects from branch)"
---

# Check PR Build

Fetch and analyze GitHub Actions workflow logs for a PR to identify build failures.

## Arguments

- `$ARGUMENTS`: Optional PR number. If not provided, auto-detects from current branch.

## Workflow

### 1. Identify PR

If `$ARGUMENTS` is empty:

```bash
git branch --show-current
# Then use GitHub API to find PR for this branch
```

### 2. Get PR Details

```text
GET /repos/{owner}/{repo}/pulls/{pr_number}
```

Extract:
- `head.sha` - The commit SHA to check
- `head.ref` - The branch name

### 3. List Workflow Runs

```text
GET /repos/{owner}/{repo}/actions/runs?branch={branch}&per_page=5
```

Returns workflow runs with:
- `id` - Run ID
- `name` - Workflow name (e.g., "CI", "Docker", "Security")
- `conclusion` - `success`, `failure`, `cancelled`, `skipped`
- `status` - `completed`, `in_progress`, `queued`
- `head_sha` - Commit this run is for
- `html_url` - Link to view in GitHub

### 4. Get Jobs for Failed Runs

For each failed workflow run:

```text
GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs
```

Returns jobs with:
- `id` - Job ID
- `name` - Job name (e.g., "Test", "Lint", "Build")
- `conclusion` - `success`, `failure`, `skipped`
- `steps` - Array of step details with `name`, `conclusion`, `number`

### 5. Fetch Logs for Failed Jobs

For each failed job:

```text
GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs
```

Returns the full log text. Parse for:
- Test failures (look for `FAIL`, `Error`, `AssertionError`)
- Build errors (look for compilation errors, missing dependencies)
- Lint errors (look for ESLint, TypeScript errors)

### 6. Categorize Failures

Group failures by type:

| Category | Indicators |
|----------|------------|
| **Test Failures** | `FAIL`, `AssertionError`, test file paths |
| **Type Errors** | `TS`, `error TS`, type mismatch messages |
| **Lint Errors** | `ESLint`, `warning`, `error` with line numbers |
| **Build Errors** | `npm ERR!`, `build failed`, missing modules |
| **Security Issues** | `npm audit`, `vulnerability`, `GHSA-` |

### 7. Output Summary

Display:
- Workflow run status overview (✅/❌ for each job)
- Failed job names and their failed steps
- Extracted error messages with file locations
- Suggested fixes based on error patterns

### Example Output

```text
## PR #2 Build Status

### Workflow: CI (Run #21535157662)

| Job | Status | Failed Step |
|-----|--------|-------------|
| Security Audit | ✅ | - |
| Type Check | ✅ | - |
| Lint | ✅ | - |
| Test | ❌ | Run tests with coverage |
| Build | ⏭️ (skipped) | - |

### Test Failures (14 total)

**src/handlers/chat.test.ts** (6 failures)
- AugmentService not initialized errors
- Mock setup issue - service not calling initialize()

**src/handlers/webhook.test.ts** (7 failures)  
- Webhook 'test-webhook' not found
- Config mocking not working correctly

**src/handlers/models.test.ts** (1 failure)
- Expected 2 models, got 5 - model list changed
```

## API Reference

| Endpoint | Purpose |
|----------|---------|
| `GET /repos/{owner}/{repo}/pulls/{pr}` | Get PR details and head SHA |
| `GET /repos/{owner}/{repo}/actions/runs` | List workflow runs |
| `GET /repos/{owner}/{repo}/actions/runs/{id}/jobs` | Get jobs for a run |
| `GET /repos/{owner}/{repo}/actions/jobs/{id}/logs` | Get log content |
| `GET /repos/{owner}/{repo}/commits/{sha}/check-runs` | Alternative: check runs |

## Tips

- Focus on the **latest** workflow run for the current PR head commit
- Jobs with `conclusion: skipped` usually depend on a failed job
- Log parsing should extract the **last 50 lines** of failed steps for context
- Link to the GitHub Actions URL for full log access

