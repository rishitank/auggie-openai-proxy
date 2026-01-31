# Testing Rules

## Test-Driven Development (TDD)

**Always write tests BEFORE implementation code:**

1. **Red** - Write a failing test that defines expected behavior
2. **Green** - Write minimal code to make the test pass
3. **Refactor** - Clean up while keeping tests green

```typescript
// ❌ Wrong: Implementation first
export function parseConfig() { /* ... */ }
// Then write tests...

// ✅ Correct: Test first
describe('parseConfig', () => {
  it('should return default values when env vars are missing', () => {
    const config = parseConfig();
    expect(config.port).toBe(3000);
  });
});
// Then implement parseConfig()
```

## Render Helpers (DRY Principle)

**Always create render helper functions to reduce duplication:**

```typescript
// ❌ Wrong: Repeated setup in each test
describe('ChatHandler', () => {
  it('test 1', () => {
    const req = { body: { model: 'gpt-4', messages: [] } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    // test...
  });
  it('test 2', () => {
    const req = { body: { model: 'gpt-4', messages: [] } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    // test...
  });
});

// ✅ Correct: Render helper with defaults
describe('ChatHandler', () => {
  const createMockRequest = (overrides = {}) => ({
    body: { model: 'gpt-4', messages: [], ...overrides },
  });

  const createMockResponse = () => ({
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  });

  it('test 1', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    // test...
  });
});
```

## Parameterized Tests (test.each)

**Use `test.each` or `it.each` for testing multiple similar cases:**

```typescript
// ❌ Wrong: Separate tests for each case
it('should validate gpt-4', () => {
  expect(isValidModel('gpt-4')).toBe(true);
});
it('should validate gpt-3.5-turbo', () => {
  expect(isValidModel('gpt-3.5-turbo')).toBe(true);
});
it('should reject invalid-model', () => {
  expect(isValidModel('invalid-model')).toBe(false);
});

// ✅ Correct: Parameterized test
it.each([
  ['gpt-4', true],
  ['gpt-3.5-turbo', true],
  ['gpt-4-turbo', true],
  ['invalid-model', false],
  ['', false],
])('isValidModel(%s) should return %s', (model, expected) => {
  expect(isValidModel(model)).toBe(expected);
});
```

### Advanced Parameterized Tests

```typescript
// With objects for complex test cases
it.each([
  { input: { temp: 0 }, expected: 0, desc: 'zero temperature' },
  { input: { temp: 1 }, expected: 1, desc: 'max temperature' },
  { input: { temp: 2 }, expected: 1, desc: 'clamps above max' },
])('$desc: normalizeTemp($input) = $expected', ({ input, expected }) => {
  expect(normalizeTemperature(input.temp)).toBe(expected);
});
```

## Test Structure

```typescript
describe('ComponentName', () => {
  // 1. Render helpers at the top
  const renderComponent = (props = {}) => { /* ... */ };
  const createMockDeps = () => { /* ... */ };

  // 2. Setup/teardown
  beforeEach(() => { /* ... */ });
  afterEach(() => { /* ... */ });

  // 3. Group related tests
  describe('when initialized', () => {
    it.each([/* parameterized cases */])('...', () => {});
  });

  describe('when handling errors', () => {
    it.each([/* error cases */])('...', () => {});
  });
});
```

## Coverage Requirements

- Minimum 80% coverage for lines, statements, and branches
- Run `npm run test:coverage` before committing
- New code must have corresponding tests

