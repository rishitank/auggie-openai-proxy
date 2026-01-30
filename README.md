# 🚀 Auggie OpenAI Proxy

An OpenAI-compatible API proxy that wraps the [@augmentcode/auggie-sdk](https://docs.augmentcode.com/cli/sdk-typescript) for use with Clawdbot/Montbot.

## ✨ Features

- **OpenAI API Compatibility** - Drop-in replacement for OpenAI's `/v1/chat/completions`
- **Augment Context Engine** - Leverages Augment's powerful codebase understanding
- **Streaming Support** - Real-time streaming responses
- **Multi-turn Conversations** - Full conversation history support
- **IFTTT Webhook** - Google Assistant integration endpoint
- **Multiple Models** - Access Claude, GPT-5, and other models

## 📦 Installation

```bash
cd auggie-proxy
npm install
```

## ⚙️ Configuration

Create a `.env` file from the example:

```bash
cp .env.example .env
```

### Option 1: Use Environment Variables

```env
AUGMENT_API_TOKEN=your-token-from-auggie-token-print
AUGMENT_API_URL=https://api.augmentcode.com
```

### Option 2: Use Session File (Auto-detected)

If you've logged in with `auggie login`, credentials are automatically loaded from `~/.augment/session.json`.

## 🚀 Running

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm run build
npm start
```

## 🔌 Clawdbot Configuration

Add this model to your `clawdbot.json`:

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

Then set it as your agent's model:

```json
{
  "agents": {
    "main": {
      "model": "augment/claude-sonnet-4-5"
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

## 🎙️ Google Assistant Integration

Configure IFTTT to send webhooks to `/ifttt/webhook`:

**Webhook Body:**
```json
{
  "value1": "full voice command",
  "value2": "extracted command text"
}
```

## 🐳 Docker Deployment

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3456
CMD ["node", "dist/index.js"]
```

## 📋 Available Models

- `claude-sonnet-4-5` (default)
- `claude-haiku-4.5`
- `claude-opus-4`
- `gpt-5`
- `sonnet4`

## ⚠️ Caveats

- Token in session.json may expire (re-login with `auggie login`)
- Unofficial API - may change without notice
- Rate limits may apply

