# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-01-30

### Added

- Named webhooks system with per-webhook configuration
- Support for multiple LLM backends (Augment, OpenAI, Ollama)
- Multiple payload format support (IFTTT, Zapier, Make, generic)
- `GET /webhooks` endpoint to list configured webhooks
- `POST /webhook/:name` endpoint for named webhook calls
- Zod validation with `.refine()` for webhook payloads
- 60s timeout for OpenAI API calls

### Changed

- Replaced IFTTT-specific handler with generic webhook handler
- Webhooks now validated through `safeParse()` with error logging

## [1.3.0] - 2026-01-29

### Added

- Context enhancement feature using DirectContext
- Automatic codebase indexing for prompt enrichment
- TypeScript path aliases (`@config`, `@types`, `@services/*`, etc.)
- tsup bundler for production builds

### Changed

- Modernized codebase with Express v5
- Updated to Node.js 25

## [1.2.0] - 2026-01-28

### Added

- ESLint 9 with strict TypeScript rules
- Vitest for testing
- TypeScript enums for type safety

## [1.1.0] - 2026-01-27

### Added

- Initial OpenAI-compatible proxy implementation
- Chat completions endpoint
- Models listing endpoint
- Health check endpoint

## [1.0.0] - 2026-01-26

### Added

- Initial release
- Basic Express.js server
- Auggie SDK integration
