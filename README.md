# 🚀 Auggie OpenAI Proxy

An OpenAI-compatible API proxy that exposes [Augment Code's](https://www.augmentcode.com/) AI capabilities through a standard OpenAI API interface. Use Augment's powerful models with **any OpenAI-compatible client**.

## ✨ Features

- **OpenAI API Compatibility** - Drop-in replacement for OpenAI's `/v1/chat/completions`
- **Streaming Support** - Real-time SSE streaming responses
- **Context Enhancement** - Automatically enrich prompts with codebase context
- **Multiple Models** - Access Claude Sonnet/Haiku/Opus 4.5, GPT-5 (see [Available Models](#-available-models))
- **Request Validation** - [Zod](https://zod.dev/) schemas for runtime type safety
- **IFTTT Webhook** - [Google Assistant](https://assistant.google.com/) integration via [IFTTT](https://ifttt.com/)

## 🏗️ Architecture

Built following SOLID principles:
- **Single Responsibility** - Each module handles one concern
- **Open/Closed** - Extensible via services, closed for modification
- **Dependency Inversion** - Depends on abstractions (interfaces)

Tech stack:
- **[Node.js](https://nodejs.org/)** (version in `.nvmrc`)
- **[TypeScript](https://www.typescriptlang.org/) 5.8** with ESNext target
- **[Express 5](https://expressjs.com/)** for HTTP handling
- **[Zod](https://zod.dev/)** for runtime validation
- **[Vitest](https://vitest.dev/)** for testing
- **[tsup](https://tsup.egoist.dev/)** for bundling

## 📦 Installation

```bash
cd auggie-proxy

# Use correct Node version (requires nvm)
nvm use

npm install
```

## ⚙️ Configuration

```bash
cp .env.example .env
```

### Core Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `AUGMENT_API_TOKEN` | API token (from `~/.augment/session.json`) | Auto-detect |
| `AUGMENT_API_URL` | API endpoint | `https://api.augmentcode.com` |
| `PORT` | Server port | `3456` |
| `HOST` | Bind address | `0.0.0.0` |
| `DEFAULT_MODEL` | Default model | `claude-sonnet-4-5` |

### Context Enhancement (Optional)

Automatically enrich prompts with relevant codebase context:

| Variable | Description | Default |
|----------|-------------|---------|
| `CONTEXT_ENABLED` | Enable context enhancement | `false` |
| `CONTEXT_WORKSPACE_DIR` | Directory to index | - |
| `CONTEXT_STATE_FILE` | Persist index state | - |
| `CONTEXT_MAX_FILE_SIZE` | Max file size to index (bytes) | `102400` |

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

## 🔌 Usage Examples

### Python ([OpenAI SDK](https://github.com/openai/openai-python))

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3456/v1",
    api_key="not-needed"  # Uses Augment session
)

# Use any available model (see Available Models section)
response = client.chat.completions.create(
    model="claude-sonnet-4-5",  # or claude-opus-4-5, claude-haiku-4-5, gpt-5
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)
```

### Node.js ([OpenAI SDK](https://github.com/openai/openai-node))

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:3456/v1',
  apiKey: 'not-needed',
});

// Use any available model (see Available Models section)
const response = await client.chat.completions.create({
  model: 'claude-opus-4-5',  // or claude-sonnet-4-5, claude-haiku-4-5, gpt-5
  messages: [{ role: 'user', content: 'Hello!' }],
});
console.log(response.choices[0].message.content);
```

### cURL

```bash
# Use any available model
curl http://localhost:3456/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-haiku-4-5",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Streaming

```bash
curl http://localhost:3456/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

### [LangChain](https://python.langchain.com/)

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    base_url="http://localhost:3456/v1",
    api_key="not-needed",
    model="claude-sonnet-4-5"  # or any available model
)

response = llm.invoke("Hello!")
```

### [Moltbot](https://www.molt.bot/)

[Moltbot](https://www.molt.bot/) is a personal AI assistant that supports OpenAI-compatible APIs. Add to your `moltbot.json` (or `clawdbot.json`):

```json
{
  "models": {
    "augment/claude-sonnet-4-5": {
      "api": "openai-completions",
      "baseUrl": "http://localhost:3456/v1",
      "model": "claude-sonnet-4-5"
    },
    "augment/claude-opus-4-5": {
      "api": "openai-completions",
      "baseUrl": "http://localhost:3456/v1",
      "model": "claude-opus-4-5"
    },
    "augment/claude-haiku-4-5": {
      "api": "openai-completions",
      "baseUrl": "http://localhost:3456/v1",
      "model": "claude-haiku-4-5"
    },
    "augment/gpt-5": {
      "api": "openai-completions",
      "baseUrl": "http://localhost:3456/v1",
      "model": "gpt-5"
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

## 🎙️ Google Assistant ([IFTTT](https://ifttt.com/))

Configure an [IFTTT](https://ifttt.com/) webhook to POST to `/ifttt/webhook` for [Google Assistant](https://assistant.google.com/) integration:

```json
{ "value1": "command", "value2": "extracted text" }
```

## 🐳 Docker

```bash
# Build using Node version from .nvmrc
docker build -t auggie-proxy --build-arg NODE_VERSION=$(cat .nvmrc) .

# Run
docker run -p 3456:3456 -e AUGMENT_API_TOKEN=xxx auggie-proxy
```

## 📋 Available Models

Models available through [Augment Code](https://www.augmentcode.com/):

| Model | Description | Use Case |
|-------|-------------|----------|
| `claude-sonnet-4-5` | [Claude Sonnet 4.5](https://www.anthropic.com/claude) | Default, best balance of speed/quality |
| `claude-haiku-4-5` | [Claude Haiku 4.5](https://www.anthropic.com/claude) | Fast, lightweight tasks |
| `claude-opus-4-5` | [Claude Opus 4.5](https://www.anthropic.com/claude) | Most capable, complex reasoning |
| `claude-sonnet-4` | [Claude Sonnet 4](https://www.anthropic.com/claude) | Previous generation |
| `gpt-5` | [OpenAI GPT-5](https://openai.com/) | OpenAI's latest model |

> **Tip:** Use `GET /v1/models` to list all available models at runtime.

## 🔍 Context Enhancement

When enabled, the proxy automatically enriches user prompts with relevant code snippets from your codebase:

```bash
# Enable in .env
CONTEXT_ENABLED=true
CONTEXT_WORKSPACE_DIR=/path/to/your/project
CONTEXT_STATE_FILE=/tmp/auggie-context.json
```

The context service:
1. Indexes your workspace files on startup
2. Searches for relevant code when processing requests
3. Prepends context to user messages before sending to Augment
4. Persists index state to avoid re-indexing on restart

## 📄 License

MIT

