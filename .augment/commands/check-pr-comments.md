---
description: Check and address PR review comments
argument-hint: "[pr-number] (optional, auto-detects from branch)"
---

# Check PR Comments

Fetch, analyze, and address PR review comments following best practices.

## Arguments

- `$ARGUMENTS`: Optional PR number. If not provided, auto-detects from current branch.

## Workflow

### 1. Identify PR

If `$ARGUMENTS` is empty:

```bash
git branch --show-current
# Then use GitHub API to find PR for this branch
```

### 2. Fetch Comments

Use GitHub API to fetch all review comments:

```text
GET /repos/{owner}/{repo}/pulls/{pr_number}/comments
GET /repos/{owner}/{repo}/pulls/{pr_number}/reviews
GET /repos/{owner}/{repo}/issues/{pr_number}/comments
```

### 3. Categorize Comments

Group comments by:
- **Source**: Human reviewers vs automated tools (CodeRabbit, Copilot, etc.)
- **Status**: Pending, Resolved, Outdated
- **Type**: Suggestion, Question, Request for changes, Approval

### 4. Verify Automated Claims

**IMPORTANT:** Before acting on automated review tool comments:
1. Verify factual claims independently
2. Check documentation for accuracy
3. Test suggestions before implementing
4. Do not blindly trust AI-generated reviews

### 5. Address Comments

For each actionable comment:
1. Understand the feedback
2. Implement the fix if valid
3. Create a new commit (never amend pushed commits)
4. Reply to the comment explaining the fix

### 6. Git Workflow Rules

- **Never use `--amend` on pushed commits**
- **Never use `--force` push**
- Use conventional commit format for fixes
- Keep fix commits atomic and focused

### 7. Output Summary

Display:
- Total comments found
- Comments by category
- Actions taken
- Remaining unresolved comments
