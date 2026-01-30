/**
 * Chat Completions Handler
 *
 * Single Responsibility: Handles HTTP request/response for chat completions
 * Uses Zod for runtime validation (fail fast)
 * Delegates business logic to AugmentService
 * Optionally enhances prompts with codebase context
 */

import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { getAugmentService } from '../services/augment.js';
import { getContextService } from '../services/context.js';
import {
  ChatCompletionRequestSchema,
  type OpenAIMessage,
  type ChatCompletionResponse,
  type StreamChunkResponse,
  type TokenUsage,
} from '../types/index.js';

/** Message format for the service */
interface ChatMessage {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
}

// =============================================================================
// Response Builders (DRY - reusable response construction)
// =============================================================================

/** Generate a unique completion ID */
function generateCompletionId(): string {
  return `chatcmpl-${randomUUID()}`;
}

/** Get current Unix timestamp */
function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Build a complete chat completion response
 */
function buildCompletionResponse(
  text: string,
  model: string,
  usage?: { promptTokens: number; completionTokens: number }
): ChatCompletionResponse {
  const tokenUsage: TokenUsage | undefined =
    usage !== undefined
      ? {
          prompt_tokens: usage.promptTokens,
          completion_tokens: usage.completionTokens,
          total_tokens: usage.promptTokens + usage.completionTokens,
        }
      : undefined;

  return {
    id: generateCompletionId(),
    object: 'chat.completion',
    created: getCurrentTimestamp(),
    model,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: text },
        finish_reason: 'stop',
      },
    ],
    usage: tokenUsage,
  };
}

/**
 * Build a streaming SSE chunk
 */
function buildStreamChunk(
  content: string,
  model: string,
  isLast = false
): StreamChunkResponse {
  return {
    id: generateCompletionId(),
    object: 'chat.completion.chunk',
    created: getCurrentTimestamp(),
    model,
    choices: [
      {
        index: 0,
        delta: isLast ? {} : { content },
        finish_reason: isLast ? 'stop' : null,
      },
    ],
  };
}

/** Serialize chunk to SSE format */
function toSSE(chunk: StreamChunkResponse): string {
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

// =============================================================================
// Message Conversion
// =============================================================================

/**
 * Convert OpenAI messages to service format
 */
function toChatMessages(messages: readonly OpenAIMessage[]): ChatMessage[] {
  return messages.map((msg) => ({ role: msg.role, content: msg.content }));
}

// =============================================================================
// Request Handler
// =============================================================================

/**
 * Enhance messages with codebase context if available
 * Only enhances the last user message
 */
async function enhanceMessagesWithContext(
  messages: ChatMessage[]
): Promise<ChatMessage[]> {
  const contextService = getContextService();
  if (!contextService.isReady()) {
    return messages;
  }

  // Find the last user message to enhance
  const lastUserIndex = messages.findLastIndex((m) => m.role === 'user');
  if (lastUserIndex === -1) {
    return messages;
  }

  const lastUserMessage = messages[lastUserIndex];
  if (lastUserMessage === undefined) {
    return messages;
  }

  const enhancedContent = await contextService.enhancePrompt(lastUserMessage.content);
  if (enhancedContent === lastUserMessage.content) {
    return messages;
  }

  console.log('[Chat] Enhanced message with codebase context');
  const result = [...messages];
  result[lastUserIndex] = { ...lastUserMessage, content: enhancedContent };
  return result;
}

/**
 * Handle chat completion requests (streaming and non-streaming)
 */
export async function handleChatCompletion(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body with Zod
    const parseResult = ChatCompletionRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: {
          message: parseResult.error.errors[0]?.message ?? 'Invalid request',
          type: 'invalid_request_error',
        },
      });
      return;
    }

    const { model, messages, stream } = parseResult.data;
    const rawMessages = toChatMessages(messages);

    // Enhance with codebase context if available
    const chatMessages = await enhanceMessagesWithContext(rawMessages);

    const service = getAugmentService();

    console.log(`[Chat] Model: ${model}, Messages: ${String(messages.length)}, Stream: ${String(stream)}`);

    if (stream) {
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Stream chunks
      for await (const chunk of service.streamCompletion(chatMessages, model)) {
        res.write(toSSE(buildStreamChunk(chunk, model)));
      }

      // Send final chunk and done signal
      res.write(toSSE(buildStreamChunk('', model, true)));
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      // Non-streaming response
      const result = await service.generateCompletion(chatMessages, model);
      res.json(buildCompletionResponse(result.text, model, result.usage));
    }
  } catch (error) {
    console.error('[Chat] Error:', error);
    next(error);
  }
}

