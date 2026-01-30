# 🚀 Auggie OpenAI Proxy

An OpenAI-compatible API proxy that exposes [Augment Code's](https://augmentcode.com) AI capabilities through a standard OpenAI API interface. Use Augment's powerful models with **any OpenAI-compatible client**.

## ✨ Features

- **OpenAI API Compatibility** - Drop-in replacement for OpenAI's `/v1/chat/completions`
- **Streaming Support** - Real-time SSE streaming responses
- **Context Enhancement** - Automatically enrich prompts with codebase context
- **Multiple Models** - Access Claude Sonnet/Haiku/Opus 4.5, GPT-5
- **Request Validation** - Zod schemas for runtime type safety
- **IFTTT Webhook** - Google Assistant integration endpoint

## 🏗️ Architecture

Built following SOLID principles:
- **Single Responsibility** - Each module handles one concern
- **Open/Closed** - Extensible via services, closed for modification
- **Dependency Inversion** - Depends on abstractions (interfaces)

Tech stack:
- **Node.js** (version in `.nvmrc`)
- **TypeScript 5.8** with ESNext target
- **Express 5** for HTTP handling
- **Zod** for runtime validation
- **Vitest** for testing

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

### Python (OpenAI SDK)

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3456/v1",
    api_key="not-needed"  # Uses Augment session
)

response = client.chat.completions.create(
    model="claude-sonnet-4-5",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)
```

### Node.js (OpenAI SDK)

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:3456/v1',
  apiKey: 'not-needed',
});

const response = await client.chat.completions.create({
  model: 'claude-sonnet-4-5',
  messages: [{ role: 'user', content: 'Hello!' }],
});
console.log(response.choices[0].message.content);
```

### cURL

```bash
curl http://localhost:3456/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Streaming

```bash
curl http://localhost:3456/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

### LangChain

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    base_url="http://localhost:3456/v1",
    api_key="not-needed",
    model="claude-sonnet-4-5"
)

response = llm.invoke("Hello!")
```

### Clawdbot

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
# Build using Node version from .nvmrc
docker build -t auggie-proxy --build-arg NODE_VERSION=$(cat .nvmrc) .

# Run
docker run -p 3456:3456 -e AUGMENT_API_TOKEN=xxx auggie-proxy
```

## 📋 Available Models

| Model | Description |
|-------|-------------|
| `claude-sonnet-4-5` | Claude Sonnet 4.5 (default, best balance) |
| `claude-haiku-4-5` | Claude Haiku 4.5 (fast, lightweight) |
| `claude-opus-4-5` | Claude Opus 4.5 (most capable) |
| `claude-sonnet-4` | Claude Sonnet 4 (previous gen) |
| `gpt-5` | OpenAI GPT-5 |

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

