# API Design Rules

## OpenAI-Compatible Proxy

This project implements an OpenAI-compatible API proxy for the Augment SDK.

## Role Mapping

OpenAI roles map to Augment SDK roles:

| OpenAI Role | Augment Role |
|-------------|--------------|
| `system` | `System` |
| `developer` | `System` (mapped) |
| `user` | `User` |
| `assistant` | `Assistant` |

## Message Content Normalization

OpenAI message content can be string or array of content parts:

```typescript
// String content
{ role: 'user', content: 'Hello' }

// Array content (multimodal)
{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }
```

**The proxy automatically normalizes all message content to a string format for Augment SDK compatibility.** Consumers do not need to perform this conversion themselves—the `normalizeMessageContent()` utility handles both string and array (multimodal) content formats transparently.

## Streaming Responses

Use Server-Sent Events (SSE) format for streaming:

```
data: {"id":"...","choices":[{"delta":{"content":"Hello"}}]}

data: [DONE]
```
