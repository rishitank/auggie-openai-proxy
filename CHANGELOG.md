# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0](https://github.com/rishitank/auggie-openai-proxy/compare/v1.0.0...v1.1.0) (2026-03-02)


### 🚀 Features

* add /check-pr-comments slash command ([8a24738](https://github.com/rishitank/auggie-openai-proxy/commit/8a24738b9c74089604e9d3caaaba5721b2677d82))
* add /create-pr command and fix empty rule files ([faf9d19](https://github.com/rishitank/auggie-openai-proxy/commit/faf9d19d34a7187c100bba71db90e9b50a6fda7c))
* add actionlint workflow linting ([b324b32](https://github.com/rishitank/auggie-openai-proxy/commit/b324b32805ad2a3d09886f0a4b15b2741277633b))
* add CI/CD automation and version management ([1a59372](https://github.com/rishitank/auggie-openai-proxy/commit/1a59372188c4c7f7eaa2cc8d6ff82d4f591374a5))
* add CI/CD automation, test coverage, and CodeRabbit integration ([18796b4](https://github.com/rishitank/auggie-openai-proxy/commit/18796b4271786599fd7e7e8569f3a3661dc68206))
* add context enhancement for prompts ([3a53a94](https://github.com/rishitank/auggie-openai-proxy/commit/3a53a942e39b5e5c8da293b7842d22953658782e))
* add developer role support and fix test mocks ([afc6da1](https://github.com/rishitank/auggie-openai-proxy/commit/afc6da1f4852d025e97e49b2b68582c55dcbbe59))
* add ESLint with strict TypeScript rules and fix type safety ([0cc94c5](https://github.com/rishitank/auggie-openai-proxy/commit/0cc94c5488ce8c76bf2bcda769bb9a459ff5a178))
* add named webhooks system ([8fae4f1](https://github.com/rishitank/auggie-openai-proxy/commit/8fae4f1895641cec9b6576748e6d57c4c7a750d9))
* add provider-agnostic webhook handler ([f34b162](https://github.com/rishitank/auggie-openai-proxy/commit/f34b1629240d2573f96f1dddf00c9c09cae401f0))
* **ci:** complete CI/CD automation setup ([cab4107](https://github.com/rishitank/auggie-openai-proxy/commit/cab4107f4ff47cc2cbe330e893cf545c4cae58b5))
* Comprehensive improvements for production readiness ([#27](https://github.com/rishitank/auggie-openai-proxy/issues/27)) ([74cb575](https://github.com/rishitank/auggie-openai-proxy/commit/74cb5756ee15292698cb13e3e9358a6193e5d0e1))
* initial auggie-openai-proxy implementation ([d5d83a9](https://github.com/rishitank/auggie-openai-proxy/commit/d5d83a9b2d7eedb63614887a6dbfebdbee8d0ea4))
* use Node.js native TypeScript with subpath imports ([6abbcd6](https://github.com/rishitank/auggie-openai-proxy/commit/6abbcd6d651f108c977a14197c08a0fb4205fa01))


### 🐛 Bug Fixes

* add --ignore-scripts to builder npm ci to prevent husky error ([a865b53](https://github.com/rishitank/auggie-openai-proxy/commit/a865b53a0ea12837061e5c2a5058ba4c3a043049))
* add --ignore-scripts to builder npm ci to prevent husky error ([76d63ba](https://github.com/rishitank/auggie-openai-proxy/commit/76d63baba5ec391c9186db1412dfcf5fb27658a9))
* add --ignore-scripts to builder npm ci to prevent husky error ([#6](https://github.com/rishitank/auggie-openai-proxy/issues/6)) ([a865b53](https://github.com/rishitank/auggie-openai-proxy/commit/a865b53a0ea12837061e5c2a5058ba4c3a043049))
* add curl for Coolify healthcheck compatibility ([#17](https://github.com/rishitank/auggie-openai-proxy/issues/17)) ([9881ab5](https://github.com/rishitank/auggie-openai-proxy/commit/9881ab5b65101b5a9849ffdb875051e85d5a33cd))
* add node_modules/.bin to PATH for build ([d5c3a9f](https://github.com/rishitank/auggie-openai-proxy/commit/d5c3a9ff26e507459a35c4cafca38ddb54371df7))
* add node_modules/.bin to PATH for build ([a0fa60c](https://github.com/rishitank/auggie-openai-proxy/commit/a0fa60c356394470f2158038f6299b862e334c17))
* add node_modules/.bin to PATH for build ([#13](https://github.com/rishitank/auggie-openai-proxy/issues/13)) ([d5c3a9f](https://github.com/rishitank/auggie-openai-proxy/commit/d5c3a9ff26e507459a35c4cafca38ddb54371df7))
* add tsconfig.build.json to exclude vitest/globals for Docker build ([e6ad5b3](https://github.com/rishitank/auggie-openai-proxy/commit/e6ad5b36021b4193faa4b280c92e6d0144fb6ab2))
* add tsconfig.build.json to exclude vitest/globals for Docker build ([0c07068](https://github.com/rishitank/auggie-openai-proxy/commit/0c07068f578ada2575436768f0e15b26ca382c85))
* add tsconfig.build.json to exclude vitest/globals for Docker build ([#7](https://github.com/rishitank/auggie-openai-proxy/issues/7)) ([e6ad5b3](https://github.com/rishitank/auggie-openai-proxy/commit/e6ad5b36021b4193faa4b280c92e6d0144fb6ab2))
* address CodeRabbit review comments ([063bb06](https://github.com/rishitank/auggie-openai-proxy/commit/063bb069d531d8c1b6a979482fe17c83842cc03c))
* address PR review feedback ([e360881](https://github.com/rishitank/auggie-openai-proxy/commit/e36088141c8769b0ba1c8af460362473a61b3820))
* address remaining CodeRabbit review comments ([75a006e](https://github.com/rishitank/auggie-openai-proxy/commit/75a006e37b8f361357b1d6ce35d2edad5606d169))
* address remaining CodeRabbit review comments ([2be79a4](https://github.com/rishitank/auggie-openai-proxy/commit/2be79a4a60c47060d10587a2574a0d9b0d9a18c7))
* adjust coverage thresholds for Vitest 4 compatibility ([#20](https://github.com/rishitank/auggie-openai-proxy/issues/20)) ([315f06c](https://github.com/rishitank/auggie-openai-proxy/commit/315f06c682aa13486088679f22353ff164c90578))
* **ci:** update upload-artifact to v6 and fix release_created truthy check ([0ca5f0f](https://github.com/rishitank/auggie-openai-proxy/commit/0ca5f0f222987397ecf5a3d048d9fc342650474b))
* **config:** reduce CodeRabbit tone_instructions to 250 char limit ([a2b3189](https://github.com/rishitank/auggie-openai-proxy/commit/a2b3189be92d36009d6207d4a4494ce7fc3a30b4))
* correct changelog to reflect actual project history ([85064a0](https://github.com/rishitank/auggie-openai-proxy/commit/85064a067b9d2deb54a05126f0c8b11e847b29f1))
* enable CodeRabbit reviews for bot PRs ([#21](https://github.com/rishitank/auggie-openai-proxy/issues/21)) ([31b5555](https://github.com/rishitank/auggie-openai-proxy/commit/31b555597bff3163e2b2abb71209c157a07f1657))
* exclude test files from tsconfig.build.json ([ce5c9b6](https://github.com/rishitank/auggie-openai-proxy/commit/ce5c9b6ecf0c720e0dd34839a6d41280210df103))
* exclude test files from tsconfig.build.json ([c2efddc](https://github.com/rishitank/auggie-openai-proxy/commit/c2efddce1460d42e7133ad2788f6507b76b62c17))
* exclude test files from tsconfig.build.json ([#9](https://github.com/rishitank/auggie-openai-proxy/issues/9)) ([ce5c9b6](https://github.com/rishitank/auggie-openai-proxy/commit/ce5c9b6ecf0c720e0dd34839a6d41280210df103))
* include express and compression types in tsconfig.build.json ([796ec39](https://github.com/rishitank/auggie-openai-proxy/commit/796ec39081147c91a9a679d369b7116b7df06918))
* include express and compression types in tsconfig.build.json ([ebda626](https://github.com/rishitank/auggie-openai-proxy/commit/ebda6268dd02d89fae2786e8ce16ad3223bb05da))
* include express and compression types in tsconfig.build.json ([#10](https://github.com/rishitank/auggie-openai-proxy/issues/10)) ([796ec39](https://github.com/rishitank/auggie-openai-proxy/commit/796ec39081147c91a9a679d369b7116b7df06918))
* remove type checking from Docker build ([d24ec60](https://github.com/rishitank/auggie-openai-proxy/commit/d24ec60ee522f7d83a6a478bd75220719a143f76))
* remove type checking from Docker build ([e4d28ff](https://github.com/rishitank/auggie-openai-proxy/commit/e4d28ffa391c31da0dd98024e8cb24712778790a))
* remove type checking from Docker build ([#11](https://github.com/rishitank/auggie-openai-proxy/issues/11)) ([d24ec60](https://github.com/rishitank/auggie-openai-proxy/commit/d24ec60ee522f7d83a6a478bd75220719a143f76))
* reset version to 1.0.0 for initial release ([5f9fa14](https://github.com/rishitank/auggie-openai-proxy/commit/5f9fa14cea078a64cea0935330e7ace7e09b1667))
* resolve type mismatch between AugmentLanguageModel and AI SDK ([b57842e](https://github.com/rishitank/auggie-openai-proxy/commit/b57842e563407c6d8abc698933e182f50deba49a))
* revert hacky Docker build workarounds ([#14](https://github.com/rishitank/auggie-openai-proxy/issues/14)) ([5f2e72b](https://github.com/rishitank/auggie-openai-proxy/commit/5f2e72b8802eca890d56431d3a3dc585a13e65aa))
* **security:** address CodeRabbit review comments ([551586e](https://github.com/rishitank/auggie-openai-proxy/commit/551586e8e51049f19f01c59ff1ea3ba01a241dc2))
* **test:** remove truthy assertion for optional DESCRIPTION field ([829ef5a](https://github.com/rishitank/auggie-openai-proxy/commit/829ef5ab716455bcbd9cd18efd699b0bcbd0e9a3))
* update package author to Rishi Tank ([72b8535](https://github.com/rishitank/auggie-openai-proxy/commit/72b8535b5e4359bb63a4f27b16ca1f263873cc35))
* update to ESNext target and correct model names ([4854ec9](https://github.com/rishitank/auggie-openai-proxy/commit/4854ec9c33437725a9ba1e2aa16b2375a994af42))
* use --include=dev for Coolify compatibility ([#15](https://github.com/rishitank/auggie-openai-proxy/issues/15)) ([b70d696](https://github.com/rishitank/auggie-openai-proxy/commit/b70d696a3c48709269c94eb460fe81402a88f404))
* use --include=dev for Coolify compatibility ([#15](https://github.com/rishitank/auggie-openai-proxy/issues/15)) ([#16](https://github.com/rishitank/auggie-openai-proxy/issues/16)) ([ac1c99d](https://github.com/rishitank/auggie-openai-proxy/commit/ac1c99dcb36e1ea0dc2a59f12bfcbedb81bead61))
* use npx tsc instead of tsc in Dockerfile ([7507eda](https://github.com/rishitank/auggie-openai-proxy/commit/7507eda0d3dd9eb2ba0711cc54fb7e363296cc03))
* use npx tsc instead of tsc in Dockerfile ([86d1161](https://github.com/rishitank/auggie-openai-proxy/commit/86d116155a84fa73ce181e1d891ecdde54113170))
* use npx tsc instead of tsc in Dockerfile ([#8](https://github.com/rishitank/auggie-openai-proxy/issues/8)) ([7507eda](https://github.com/rishitank/auggie-openai-proxy/commit/7507eda0d3dd9eb2ba0711cc54fb7e363296cc03))
* use npx tsup instead of npm run build ([54bec90](https://github.com/rishitank/auggie-openai-proxy/commit/54bec901714f70df542401248ff17a142c8e239b))
* use npx tsup instead of npm run build ([8305e0a](https://github.com/rishitank/auggie-openai-proxy/commit/8305e0a01384c9c2fdc5670324cd5e4180a27508))
* use npx tsup instead of npm run build ([#12](https://github.com/rishitank/auggie-openai-proxy/issues/12)) ([54bec90](https://github.com/rishitank/auggie-openai-proxy/commit/54bec901714f70df542401248ff17a142c8e239b))
* use PAT for auto-merge to trigger closed event ([#18](https://github.com/rishitank/auggie-openai-proxy/issues/18)) ([9ec9725](https://github.com/rishitank/auggie-openai-proxy/commit/9ec97259e70ce4326a5dd1b50e7c9d7b51352ac9))


### ♻️ Refactoring

* address CodeRabbit suggestions ([afa906a](https://github.com/rishitank/auggie-openai-proxy/commit/afa906a854aead82e4060412376619779afd8c29))
* apply SOLID, KISS, DRY principles and modernize stack ([738b8f5](https://github.com/rishitank/auggie-openai-proxy/commit/738b8f5f092e654fd50e380947b8faac5ee3ea1f))
* convert ES5 function declarations to ES6 arrow functions ([23fc14a](https://github.com/rishitank/auggie-openai-proxy/commit/23fc14a2a444de6cd3350435fb22e3e135ebe298))
* use TypeScript enums for type safety ([c1c9c4f](https://github.com/rishitank/auggie-openai-proxy/commit/c1c9c4f1577a9cda48194c92ab80d690a95e7ca4))


### 📚 Documentation

* add .augment/rules for project conventions ([da38696](https://github.com/rishitank/auggie-openai-proxy/commit/da3869601fa1b6ff81d42688044e6b45db4a0d84))
* address CodeRabbit review comments for augment rules ([4b60f7f](https://github.com/rishitank/auggie-openai-proxy/commit/4b60f7f4f49670bfa886bd9e14f5e803948729aa))
* fix markdown table spacing (MD060) ([b4905fa](https://github.com/rishitank/auggie-openai-proxy/commit/b4905fa7dfd3b8045fe5753eab0e05cf173c9d50))
* update feature list to reflect provider-agnostic webhooks ([4198476](https://github.com/rishitank/auggie-openai-proxy/commit/4198476b75b1482a43867ccc77b453a4d36bc7f0))
* update README with usage examples and make repo agnostic ([047baff](https://github.com/rishitank/auggie-openai-proxy/commit/047baff761ac1491036d7ad336598714e2dc3a12))
* update references from Clawdbot/Moltbot to OpenClaw ([#24](https://github.com/rishitank/auggie-openai-proxy/issues/24)) ([454371f](https://github.com/rishitank/auggie-openai-proxy/commit/454371f5aa09c93a8fc3fb5efe4f29fb724aaf45))


### 🧪 Tests

* add comprehensive test coverage with strict TypeScript/ESLint compliance ([1ca3d16](https://github.com/rishitank/auggie-openai-proxy/commit/1ca3d166c0924b265f4726472dff82b1496da63d))
* improve branch coverage to 83% ([#22](https://github.com/rishitank/auggie-openai-proxy/issues/22)) ([2da5ce2](https://github.com/rishitank/auggie-openai-proxy/commit/2da5ce2b040de27e78654644e05035029f7526d8))
* improve context service coverage to 96% and update augment rules ([266a60e](https://github.com/rishitank/auggie-openai-proxy/commit/266a60e1bfdb17eeeda32ba667a0ce365e97f611))


### 🔧 CI/CD

* add CodeRabbit configuration with custom Auggie persona ([25a0262](https://github.com/rishitank/auggie-openai-proxy/commit/25a0262b03be8a30ceab21c4de6924e531b2199d))
* consolidate CI, Docker, and Security workflows into single ci.yml ([c9bfc60](https://github.com/rishitank/auggie-openai-proxy/commit/c9bfc602970dd7787497f0d05635fdad866f12e0))
* **deps:** bump actions/upload-artifact from 6 to 7 ([88eb975](https://github.com/rishitank/auggie-openai-proxy/commit/88eb97511671005b0d4d1d2537d9c8b2e8d270bf))
* **deps:** bump actions/upload-artifact from 6 to 7 ([e1bb612](https://github.com/rishitank/auggie-openai-proxy/commit/e1bb612539d0f96d2448b0aa183c66adccbd5370))
* expand Darth Vader persona with full Sith Lord instructions ([c9867f4](https://github.com/rishitank/auggie-openai-proxy/commit/c9867f43a2156bfe58f87fd6325a54bfad95f5e3))
* transform CodeRabbit persona to Darth Vader ([a70f8fb](https://github.com/rishitank/auggie-openai-proxy/commit/a70f8fb422bed1a28860f9a1012a50d6b1f01b30))
* upgrade to latest GitHub Actions versions ([da5d7f6](https://github.com/rishitank/auggie-openai-proxy/commit/da5d7f65b6a9137ef47c3c29fee896c903e6465f))


### 📦 Build

* add tsup bundler and path aliases ([285bf65](https://github.com/rishitank/auggie-openai-proxy/commit/285bf65667b3156d735724602a0f20077dd72585))
* add tsup bundler, path aliases, and README improvements ([093cddc](https://github.com/rishitank/auggie-openai-proxy/commit/093cddcd19d6439b8c4a206e715940933174a379))

## [Unreleased]

## [1.0.0] - 2026-01-30

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
- Vitest for testing with 80%+ coverage
- tsup bundler for production builds
- CI/CD automation with GitHub Actions
- Conventional commits with commitlint + husky
- Automated releases with release-please
- Docker support with GHCR publishing
- Security scanning (npm audit, CodeQL, dependency review)
- Dependabot for automated dependency updates
