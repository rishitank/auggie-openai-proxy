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

Always normalize to string for Augment SDK compatibility.

## Streaming Responses

Use Server-Sent Events (SSE) format for streaming:

```
data: {"id":"...","choices":[{"delta":{"content":"Hello"}}]}

data: [DONE]
```
