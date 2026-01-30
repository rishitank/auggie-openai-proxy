# 🚀 Auggie OpenAI Proxy

An OpenAI-compatible API proxy that wraps the [@augmentcode/auggie-sdk](https://docs.augmentcode.com/cli/sdk-typescript) for use with Clawdbot/Montbot.

## ✨ Features

- **OpenAI API Compatibility** - Drop-in replacement for OpenAI's `/v1/chat/completions`
- **Augment Context Engine** - Leverages Augment's powerful codebase understanding
- **Streaming Support** - Real-time SSE streaming responses
- **Request Validation** - Zod schemas for runtime type safety
- **IFTTT Webhook** - Google Assistant integration endpoint
- **Multiple Models** - Access Claude, GPT-5, and other models

## 🏗️ Architecture

Built following SOLID principles:
- **Single Responsibility** - Each module handles one concern
- **Open/Closed** - Extensible via services, closed for modification
- **Dependency Inversion** - Depends on abstractions (interfaces)

Tech stack:
- **Node.js 24** (latest LTS)
- **TypeScript 5.7** with ES2024 target
- **Express 5** for HTTP handling
- **Zod** for runtime validation
- **Vitest** for testing

## 📦 Installation

```bash
cd auggie-proxy
npm install
```

## ⚙️ Configuration

```bash
cp .env.example .env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `AUGMENT_API_TOKEN` | API token (from session.json) | Auto-detect |
| `AUGMENT_API_URL` | API endpoint | `https://api.augmentcode.com` |
| `PORT` | Server port | `3456` |
| `HOST` | Bind address | `0.0.0.0` |
| `DEFAULT_MODEL` | Default model | `claude-sonnet-4-5` |

## 🚀 Running

```bash
# Development (with hot reload)
npm run dev

# Production
npm run build
npm start

# Type checking
npm run typecheck

# Tests
npm test
```

## 🔌 Clawdbot Configuration

Add to `clawdbot.json`:

```json
{
  "models": {
    "augment/claude-sonnet-4-5": {
      "api": "openai-completions",
      "baseUrl": "http://localhost:3456/v1",
      "model": "claude-sonnet-4-5"
    }
  }
}
```

## 📡 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/v1/models` | List available models |
| POST | `/v1/chat/completions` | Chat completions (OpenAI format) |
| POST | `/ifttt/webhook` | IFTTT webhook for Google Assistant |

## 🎙️ Google Assistant (IFTTT)

Configure IFTTT webhook to POST to `/ifttt/webhook`:

```json
{ "value1": "command", "value2": "extracted text" }
```

## 🐳 Docker

```bash
docker build -t auggie-proxy .
docker run -p 3456:3456 -e AUGMENT_API_TOKEN=xxx auggie-proxy
```

## 📋 Available Models

- `claude-sonnet-4-5` (default)
- `claude-haiku-4.5`
- `claude-opus-4`
- `gpt-5`
- `sonnet4`

## 📄 License

MIT

