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

Use GitHub API to fetch **ALL** review comments with pagination:

**IMPORTANT:** GitHub API limits responses to 100 items per page. You MUST paginate through all pages to get all comments.

#### API Endpoints (with pagination)

```text
GET /repos/{owner}/{repo}/pulls/{pr_number}/comments?per_page=100&page=1
GET /repos/{owner}/{repo}/pulls/{pr_number}/reviews?per_page=100&page=1
GET /repos/{owner}/{repo}/issues/{pr_number}/comments?per_page=100&page=1
```

#### Pagination Strategy

For each endpoint:

1. Start with `page=1` and `per_page=100`
2. Fetch the page and collect all items
3. If the response contains 100 items, increment page and fetch again
4. Continue until a page returns fewer than 100 items (or empty)
5. Merge all pages into a single list

Example pagination loop:

```text
page = 1
all_comments = []
while true:
    response = GET /repos/{owner}/{repo}/pulls/{pr_number}/comments?per_page=100&page={page}
    all_comments.extend(response)
    if len(response) < 100:
        break
    page += 1
```

#### Review Details

For each review returned by `/pulls/{pr_number}/reviews`, also fetch detailed review comments:

```text
GET /repos/{owner}/{repo}/pulls/{pr_number}/reviews/{review_id}/comments?per_page=100
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
