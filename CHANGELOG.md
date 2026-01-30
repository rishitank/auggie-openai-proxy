# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.4.0] - 2026-01-30

Initial release of the Auggie OpenAI Proxy.

### Added

- OpenAI-compatible API proxy using `@augmentcode/auggie-sdk`
- Chat completions endpoint (`POST /v1/chat/completions`)
- Models listing endpoint (`GET /v1/models`)
- Health check endpoint (`GET /health`)
- Named webhooks system with per-webhook configuration
- Support for multiple LLM backends (Augment, OpenAI, Ollama)
- Multiple payload format support (IFTTT, Zapier, Make, generic)
- `GET /webhooks` endpoint to list configured webhooks
- `POST /webhook/:name` endpoint for named webhook calls
- Context enhancement using DirectContext for codebase-aware responses
- TypeScript with path aliases (`@config`, `@types`, `@services/*`, etc.)
- Express v5 with Zod validation
- ESLint 9 with strict TypeScript rules
- Vitest for testing
- tsup bundler for production builds
- CI/CD automation with GitHub Actions
- Conventional commits with commitlint + husky
- Automated releases with release-please
- Docker support with GHCR publishing
- Security scanning (npm audit, CodeQL, dependency review)
- Dependabot for automated dependency updates
