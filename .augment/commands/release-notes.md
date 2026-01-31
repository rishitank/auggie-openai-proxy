# Generate Release Notes

Generate release notes from commits since the last release.

## Steps

1. Find the last release tag:

   ```bash
   git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0"
   ```

2. Get commits since last release:

   ```bash
   git log <last-tag>..HEAD --oneline --no-merges
   ```

3. Parse conventional commits and categorize:
   - `feat:` → ✨ Features
   - `fix:` → 🐛 Bug Fixes
   - `perf:` → ⚡ Performance
   - `docs:` → 📚 Documentation
   - `refactor:` → ♻️ Refactoring
   - `test:` → 🧪 Tests
   - `ci:` → 🔧 CI/CD
   - `chore:` → 🧹 Chores
   - Breaking changes (!) → 💥 Breaking Changes

4. Generate markdown release notes

## Output Format

```markdown
# Release Notes - vX.Y.Z

## 💥 Breaking Changes
- Description of breaking change

## ✨ Features
- feat(scope): description (#PR)

## 🐛 Bug Fixes
- fix(scope): description (#PR)

## ⚡ Performance
- perf(scope): description (#PR)

## 📚 Documentation
- docs(scope): description (#PR)

## 🔧 Other Changes
- chore/refactor/test changes

---
**Full Changelog**: https://github.com/owner/repo/compare/v1.0.0...v1.1.0
```

## Options

- `--since <tag>` - Generate notes since specific tag
- `--draft` - Include unreleased changes
- `--contributors` - Include contributor list

