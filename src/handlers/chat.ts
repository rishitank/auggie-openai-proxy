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
import { getAugmentService } from '#services/augment';
import { getContextService } from '#services/context';
import {
  MessageRole,
  FinishReason,
  ChatCompletionRequestSchema,
  normalizeMessageContent,
  type ChatCompletionResponse,
  type StreamChunkResponse,
  type TokenUsage,
} from '#types';

/** Message format for the service */
interface ChatMessage {
  readonly role: MessageRole;
  readonly content: string;
}

// =============================================================================
// Response Builders (DRY - reusable response construction)
// =============================================================================

/** Generate a unique completion ID */
const generateCompletionId = (): string => `chatcmpl-${randomUUID()}`;

/** Get current Unix timestamp */
const getCurrentTimestamp = (): number => Math.floor(Date.now() / 1000);

/**
 * Build a complete chat completion response
 */
const buildCompletionResponse = (
  text: string,
  model: string,
  usage?: { promptTokens: number; completionTokens: number }
): ChatCompletionResponse => {
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
        message: { role: MessageRole.Assistant, content: text },
        finish_reason: FinishReason.Stop,
      },
    ],
    usage: tokenUsage,
  };
};

/**
 * Build a streaming SSE chunk
 */
const buildStreamChunk = (
  content: string,
  model: string,
  isLast = false
): StreamChunkResponse => ({
  id: generateCompletionId(),
  object: 'chat.completion.chunk',
  created: getCurrentTimestamp(),
  model,
  choices: [
    {
      index: 0,
      delta: isLast ? {} : { content },
      finish_reason: isLast ? FinishReason.Stop : null,
    },
  ],
});

/** Serialize chunk to SSE format */
const toSSE = (chunk: StreamChunkResponse): string => `data: ${JSON.stringify(chunk)}\n\n`;

// =============================================================================
// Message Conversion
// =============================================================================

/**
 * Convert OpenAI messages to service format
 * Normalizes array content to string format
 */
const toChatMessages = (
  messages: readonly { role: MessageRole; content: string | { type: 'text'; text: string }[] }[]
): ChatMessage[] =>
  messages.map((msg) => {
    const normalized = normalizeMessageContent(msg);
    return { role: normalized.role, content: normalized.content };
  });

// =============================================================================
// Request Handler
// =============================================================================

/**
 * Enhance messages with codebase context if available
 * Only enhances the last user message
 */
const enhanceMessagesWithContext = async (messages: ChatMessage[]): Promise<ChatMessage[]> => {
  const contextService = getContextService();
  if (!contextService.isReady()) {
    return messages;
  }

  // Find the last user message to enhance
  const lastUserIndex = messages.findLastIndex((m) => m.role === MessageRole.User);
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
};

/**
 * Handle chat completion requests (streaming and non-streaming)
 */
export const handleChatCompletion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
};

