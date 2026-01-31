# Debug Issue

Systematic debugging workflow for investigating and resolving issues.

## Steps

### 1. Understand the Problem

- What is the expected behavior?
- What is the actual behavior?
- When did it start happening?
- Can it be reproduced consistently?

### 2. Gather Information

```bash
# Check recent changes
git log --oneline -20

# Check for related test failures
npm test -- --testNamePattern="<related-pattern>"

# Check logs if available
cat logs/*.log | tail -100
```

### 3. Isolate the Issue

- Identify the minimal reproduction case
- Determine which component/module is affected
- Check if it's a regression (git bisect if needed)

### 4. Form Hypotheses

List potential causes ranked by likelihood:
1. Most likely cause
2. Second most likely
3. Edge case scenario

### 5. Test Hypotheses

For each hypothesis:
1. Write a failing test that reproduces the issue
2. Verify the test fails for the right reason
3. Implement the fix
4. Verify the test passes
5. Run full test suite to check for regressions

### 6. Document Findings

```markdown
## Issue Summary
**Problem**: Brief description
**Root Cause**: What caused it
**Solution**: How it was fixed
**Prevention**: How to prevent similar issues

## Related Files
- `path/to/file.ts` - Description of changes

## Test Coverage
- Added test: `describe('...', () => { ... })`
```

## Debugging Tools

```bash
# Run specific test in watch mode
npm test -- --watch --testNamePattern="<pattern>"

# Run with verbose output
npm test -- --verbose

# Debug with Node inspector
node --inspect-brk node_modules/.bin/vitest run
```

## Common Issues Checklist

- [ ] Type mismatch (check TypeScript errors)
- [ ] Async/await missing
- [ ] Null/undefined not handled
- [ ] Environment variable missing
- [ ] Dependency version mismatch
- [ ] Race condition
- [ ] Cache invalidation issue

