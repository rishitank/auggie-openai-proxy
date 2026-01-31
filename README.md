# 🚀 Auggie OpenAI Proxy

An OpenAI-compatible API proxy that exposes [Augment Code's](https://www.augmentcode.com/) AI capabilities through a standard OpenAI API. Use Augment's powerful models with **any OpenAI-compatible client**.

## ✨ Features

- **OpenAI API Compatibility** - Drop-in replacement for OpenAI's `/v1/chat/completions`
- **Streaming Support** - Real-time SSE streaming responses
- **Context Enhancement** - Automatically enrich prompts with codebase context
- **Multiple Models** - Access Claude Sonnet/Haiku/Opus 4.5, GPT-5 (see [Available Models](#-available-models))
- **Request Validation** - [Zod](https://zod.dev/) schemas for runtime type safety
- **Named Webhooks** - Provider-agnostic webhooks for [IFTTT](https://ifttt.com/), [Zapier](https://zapier.com/), [Make](https://www.make.com/), and custom integrations

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
cd auggie-openai-proxy

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

[Moltbot](https://www.molt.bot/) is a personal AI assistant that supports OpenAI-compatible APIs. Add to your `~/.clawdbot/clawdbot.json`:

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
    "augment/claude-sonnet-4": {
      "api": "openai-completions",
      "baseUrl": "http://localhost:3456/v1",
      "model": "claude-sonnet-4"
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
| GET | `/webhooks` | List all configured webhooks |
| POST | `/webhook/:name` | Call a named webhook |

## 🔗 Named Webhooks

Configure **multiple webhooks**, each with its own model, system prompt, and LLM backend. Perfect for:

- **Different assistants** - Personal vs work, concise vs detailed
- **Different models** - Fast (Haiku) vs powerful (Opus)
- **Different backends** - Augment, OpenAI, Ollama, LM Studio

### Configuration

Set the `WEBHOOKS` environment variable as a JSON array:

```bash
WEBHOOKS='[
  {
    "name": "assistant",
    "description": "Google Assistant via IFTTT",
    "model": "claude-sonnet-4-5",
    "systemPrompt": "You are a helpful personal assistant. Be concise."
  },
  {
    "name": "coding",
    "description": "Coding help with Opus",
    "model": "claude-opus-4-5",
    "systemPrompt": "You are an expert programmer. Provide code examples."
  },
  {
    "name": "quick",
    "description": "Fast responses with Haiku",
    "model": "claude-haiku-4-5",
    "systemPrompt": "Be extremely brief. One sentence max."
  },
  {
    "name": "ollama",
    "description": "Local Ollama for private queries",
    "llmBaseUrl": "http://localhost:11434/v1",
    "model": "llama2"
  }
]'
```

### Webhook Properties

| Property       | Required | Description                              |
| -------------- | -------- | ---------------------------------------- |
| `name`         | ✅       | Unique identifier (used in URL)          |
| `description`  |          | Human-readable description               |
| `enabled`      |          | Enable/disable (default: true)           |
| `model`        |          | Model to use (default: `DEFAULT_MODEL`)  |
| `systemPrompt` |          | System prompt for this webhook           |
| `llmBaseUrl`   |          | LLM endpoint (default: this proxy)       |
| `llmApiKey`    |          | API key for LLM (default: "not-needed")  |

### Supported Payload Formats

All webhooks accept multiple payload formats:

| Source                       | Payload Format                                            |
| ---------------------------- | --------------------------------------------------------- |
| [IFTTT](https://ifttt.com/)  | `{ "value1": "...", "value2": "text" }`                   |
| [Zapier](https://zapier.com/)| `{ "message": "text" }` or `{ "query": "text" }`          |
| [Make](https://www.make.com/)| `{ "text": "..." }` or `{ "prompt": "..." }`              |
| Generic                      | `{ "text": "...", "model": "...", "system_prompt": "..." }`|

The webhook tries these fields in order: `text`, `prompt`, `message`, `query`, `content`, `input`, `value2`, `value1`.

### List Webhooks

```bash
curl https://your-server.com/webhooks
```

Response:
```json
{
  "count": 4,
  "webhooks": [
    { "name": "assistant", "description": "Google Assistant via IFTTT", "enabled": true, "model": "claude-sonnet-4-5" },
    { "name": "coding", "description": "Coding help with Opus", "enabled": true, "model": "claude-opus-4-5" },
    { "name": "quick", "description": "Fast responses with Haiku", "enabled": true, "model": "claude-haiku-4-5" },
    { "name": "ollama", "description": "Local Ollama for private queries", "enabled": true, "model": "llama2" }
  ]
}
```

### Call a Webhook

```bash
# Call the "assistant" webhook
curl https://your-server.com/webhook/assistant \
  -H "Content-Type: application/json" \
  -d '{ "text": "What time is it in Tokyo?" }'

# Call the "coding" webhook
curl https://your-server.com/webhook/coding \
  -H "Content-Type: application/json" \
  -d '{ "text": "Write a Python function to reverse a string" }'

# Override model in payload
curl https://your-server.com/webhook/assistant \
  -H "Content-Type: application/json" \
  -d '{ "text": "Complex question", "model": "claude-opus-4-5" }'
```

## 🎙️ Google Assistant Setup

Use [IFTTT](https://ifttt.com/) to connect [Google Assistant](https://assistant.google.com/) to a named webhook:

### Step 1: Configure Webhook

Add an "assistant" webhook to your `WEBHOOKS` config:

```json
{
  "name": "assistant",
  "description": "Google Assistant",
  "model": "claude-sonnet-4-5",
  "systemPrompt": "You are a helpful personal assistant. Be concise and friendly."
}
```

### Step 2: Create IFTTT Applet

1. Go to [IFTTT](https://ifttt.com/) and create a new Applet
2. **If This**: Choose "Google Assistant" → "Say a phrase with a text ingredient"
3. Set the phrase: "Ask AI $" (where $ is the text ingredient)
4. **Then That**: Choose "Webhooks" → "Make a web request"

### Step 3: Configure IFTTT Webhook

| Field | Value |
|-------|-------|
| URL | `https://your-server.com/webhook/assistant` |
| Method | `POST` |
| Content Type | `application/json` |
| Body | `{ "value1": "{{GoogleAssistant}}", "value2": "{{TextField}}" }` |

### Response Format

```json
{
  "success": true,
  "webhook": "assistant",
  "model": "claude-sonnet-4-5",
  "prompt": "What's the weather?",
  "response": "I don't have access to real-time weather data..."
}
```

## 📱 Other Automation Platforms

### [Zapier](https://zapier.com/)

1. Create a new Zap with any trigger
2. Add "Webhooks by Zapier" action → "POST"
3. URL: `https://your-server.com/webhook/assistant`
4. Data: `{ "message": "Your prompt here" }`

### [Make](https://www.make.com/) (Integromat)

1. Create a scenario with any trigger
2. Add HTTP module → "Make a request"
3. URL: `https://your-server.com/webhook/coding`
4. Body: `{ "text": "Your prompt here" }`

## 🐳 Docker

```bash
# Build using Node version from .nvmrc
docker build -t auggie-openai-proxy --build-arg NODE_VERSION=$(cat .nvmrc) .

# Run
docker run -p 3456:3456 -e AUGMENT_API_TOKEN=xxx auggie-openai-proxy
```

## 📋 Available Models

Models available through [Augment Code](https://www.augmentcode.com/):

| Model | Description | Use Case |
|-------|-------------|----------|
| `claude-sonnet-4-5` | [Claude Sonnet 4.5](https://www.anthropic.com/claude) | The default, best balance of speed/quality |
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

