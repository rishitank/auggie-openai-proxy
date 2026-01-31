# Run Tests

Run the test suite with coverage reporting and provide a summary.

## Steps

1. Run the full test suite with coverage:
   ```bash
   npm test -- --coverage
   ```

2. Analyze the results and report:
   - Total tests passed/failed/skipped
   - Coverage percentage for statements, branches, functions, lines
   - Any files below 80% coverage threshold
   - Failed test details with error messages

3. If tests fail:
   - Identify the root cause
   - Suggest fixes based on the error messages
   - Offer to fix simple issues automatically

4. If coverage is below threshold:
   - List uncovered lines/branches
   - Suggest test cases to improve coverage

## Output Format

```
## Test Results

✅ **X passed** | ❌ **Y failed** | ⏭️ **Z skipped**

## Coverage Summary

| Metric | Coverage | Status |
|--------|----------|--------|
| Statements | XX% | ✅/❌ |
| Branches | XX% | ✅/❌ |
| Functions | XX% | ✅/❌ |
| Lines | XX% | ✅/❌ |

## Files Below Threshold

- `path/to/file.ts` - XX% (missing: lines 10-15, 42)
```

