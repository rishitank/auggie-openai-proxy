# ES6+ Modern JavaScript Rules

## Always Use ES6+ Syntax

This project uses Node.js 25 with native TypeScript support. Always prefer modern ES6+ syntax over legacy ES5 patterns.

## Required Patterns

| ES5 (Avoid) | ES6+ (Preferred) |
|-------------|------------------|
| `var` | `const` / `let` |
| `function name() {}` | `const name = () => {}` or arrow functions |
| `obj.hasOwnProperty(key)` | `Object.hasOwn(obj, key)` |
| `Array.prototype.slice.call(args)` | `[...args]` spread operator |
| `Object.assign({}, obj)` | `{ ...obj }` spread operator |
| `arr.indexOf(x) !== -1` | `arr.includes(x)` |
| `for (var i = 0; ...)` | `for (const item of arr)` or `.forEach()` / `.map()` |
| `function(a, b) { return a + b; }` | `(a, b) => a + b` |
| `Promise.then().catch()` chains | `async/await` |
| `require()` | `import` / `export` |
| `module.exports` | `export default` / `export` |
| `arguments` object | Rest parameters `...args` |
| String concatenation `+` | Template literals `` `${var}` `` |
| `obj[key] || default` | `obj[key] ?? default` (nullish coalescing) |
| `obj && obj.prop` | `obj?.prop` (optional chaining) |

## Function Declaration Guidelines

```typescript
// ❌ Avoid: ES5 function declarations
function processData(data) {
  return data.map(function(item) {
    return item.value;
  });
}

// ✅ Preferred: Arrow functions
const processData = (data: Data[]): Value[] => {
  return data.map((item) => item.value);
};

// ✅ Also acceptable: Concise arrow for simple operations
const double = (n: number): number => n * 2;
```

## Exceptions

Arrow functions are NOT appropriate when:

1. **Class methods** - Use method shorthand syntax
2. **Object methods needing `this` binding** - Use method shorthand
3. **Generator functions** - Must use `function*` syntax
4. **When `this` context matters** - Arrow functions inherit `this`

```typescript
// ✅ Class methods use shorthand, not arrow functions
class Service {
  async initialize(): Promise<void> {
    // ...
  }
}

// ✅ Object methods
const handler = {
  handle() {
    return this.process();
  },
  process() {
    // ...
  },
};

// ✅ Generators must use function*
function* generateIds(): Generator<number> {
  let id = 0;
  while (true) yield id++;
}
```

## Modern Array/Object Methods

Prefer functional methods over imperative loops:

```typescript
// ❌ Avoid
const results = [];
for (let i = 0; i < items.length; i++) {
  if (items[i].active) {
    results.push(items[i].name);
  }
}

// ✅ Preferred
const results = items
  .filter((item) => item.active)
  .map((item) => item.name);
```

