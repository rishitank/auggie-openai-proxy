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
import { resolveModelAlias, AVAILABLE_MODELS } from '#config';
import {
  MessageRole,
  FinishReason,
  ChatCompletionRequestSchema,
  normalizeMessageContent,
  createErrorResponse,
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

/** Generate system fingerprint (identifies the backend configuration) */
const generateSystemFingerprint = (): string => `fp_auggie_${Date.now().toString(36)}`;

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
          // Include details with default values (Augment SDK doesn't provide these)
          prompt_tokens_details: {
            cached_tokens: 0,
            audio_tokens: 0,
          },
          completion_tokens_details: {
            reasoning_tokens: 0,
            audio_tokens: 0,
            accepted_prediction_tokens: 0,
            rejected_prediction_tokens: 0,
          },
        }
      : undefined;

  return {
    id: generateCompletionId(),
    object: 'chat.completion',
    created: getCurrentTimestamp(),
    model,
    system_fingerprint: generateSystemFingerprint(),
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

/** Streaming context to maintain consistent ID and fingerprint across chunks */
interface StreamContext {
  readonly id: string;
  readonly created: number;
  readonly systemFingerprint: string;
}

/** Create a new streaming context */
const createStreamContext = (): StreamContext => ({
  id: generateCompletionId(),
  created: getCurrentTimestamp(),
  systemFingerprint: generateSystemFingerprint(),
});

/**
 * Build a streaming SSE chunk with consistent ID across the stream
 */
const buildStreamChunk = (
  ctx: StreamContext,
  content: string,
  model: string,
  isLast = false,
  usage?: TokenUsage
): StreamChunkResponse => ({
  id: ctx.id,
  object: 'chat.completion.chunk',
  created: ctx.created,
  model,
  system_fingerprint: ctx.systemFingerprint,
  choices: [
    {
      index: 0,
      delta: isLast ? {} : { content },
      finish_reason: isLast ? FinishReason.Stop : null,
    },
  ],
  usage,
});

/** Serialize chunk to SSE format */
const toSSE = (chunk: StreamChunkResponse): string => `data: ${JSON.stringify(chunk)}\n\n`;

// =============================================================================
// Message Conversion
// =============================================================================

/** Roles that should be filtered out (not supported by Augment SDK) */
const FILTERED_ROLES: readonly MessageRole[] = [MessageRole.Tool, MessageRole.Function];

/** Message with any content type (string, array of any parts, or null) */
interface AnyContentMessage {
  role: MessageRole;
  content: string | { type: string; [key: string]: unknown }[] | null;
}

/**
 * Convert OpenAI messages to service format
 * Normalizes array content to string format (filtering out non-text parts)
 * Filters out tool/function messages (not supported by Augment SDK)
 */
const toChatMessages = (messages: readonly AnyContentMessage[]): ChatMessage[] =>
  messages
    .filter((msg) => !FILTERED_ROLES.includes(msg.role))
    .map((msg) => {
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
      const firstError = parseResult.error.errors[0];
      const errorMessage = firstError?.message ?? 'Invalid request';
      const errorPath = firstError?.path.join('.') ?? 'unknown';
      console.error(`[Chat] Validation failed: ${errorMessage} at path: ${errorPath}`);
      console.error(`[Chat] Full validation errors: ${JSON.stringify(parseResult.error.errors)}`);
      res.status(400).json(
        createErrorResponse(
          errorMessage,
          'invalid_request_error',
          'invalid_request'
        )
      );
      return;
    }

    const {
      model: requestedModel,
      messages,
      stream,
      user,
      // Token limits (supported)
      max_tokens,
      max_completion_tokens,
      stop,
      // Parameters accepted but not yet passed to Augment SDK
      temperature,
      top_p,
      presence_penalty,
      frequency_penalty,
      logprobs,
    } = parseResult.data;

    // Resolve model alias (e.g., gpt-4o -> gpt-5, claude-3-opus -> claude-opus-4-5)
    const resolvedModel = resolveModelAlias(requestedModel);
    if (resolvedModel === undefined) {
      console.error(`[Chat] Unknown model: ${requestedModel}`);
      res.status(400).json(
        createErrorResponse(
          `Unknown model: '${requestedModel}'. Available models: ${AVAILABLE_MODELS.join(', ')}`,
          'invalid_request_error',
          'model_not_found'
        )
      );
      return;
    }

    // Use resolved model (aliased or original)
    const model = resolvedModel;
    if (requestedModel !== model) {
      console.log(`[Chat] Model alias: ${requestedModel} -> ${model}`);
    }

    // Log user identifier if provided (for analytics/abuse detection)
    if (user !== undefined) {
      console.log(`[Chat] User: ${user}`);
    }

    // Log unsupported parameters that were provided
    const unsupportedParams: string[] = [];
    if (temperature !== undefined) unsupportedParams.push('temperature');
    if (top_p !== undefined) unsupportedParams.push('top_p');
    if (presence_penalty !== undefined) unsupportedParams.push('presence_penalty');
    if (frequency_penalty !== undefined) unsupportedParams.push('frequency_penalty');
    if (logprobs !== undefined) unsupportedParams.push('logprobs');

    if (unsupportedParams.length > 0) {
      console.log(`[Chat] Note: Parameters not yet supported by Augment SDK: ${unsupportedParams.join(', ')}`);
    }

    // Build generation options from request parameters
    // max_completion_tokens takes precedence over max_tokens (OpenAI convention)
    const maxOutputTokens = max_completion_tokens ?? max_tokens;
    const stopSequences = stop !== undefined
      ? (Array.isArray(stop) ? stop : [stop])
      : undefined;
    const generationOptions = {
      ...(maxOutputTokens !== undefined && { maxOutputTokens }),
      ...(stopSequences !== undefined && stopSequences.length > 0 && { stopSequences }),
    };

    if (maxOutputTokens !== undefined) {
      console.log(`[Chat] Max output tokens: ${String(maxOutputTokens)}`);
    }

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

      // Create stream context for consistent ID across all chunks
      const ctx = createStreamContext();

      // Stream chunks
      for await (const chunk of service.streamCompletion(chatMessages, model, generationOptions)) {
        res.write(toSSE(buildStreamChunk(ctx, chunk, model)));
      }

      // Send final chunk and done signal
      // Note: Token usage in streaming requires Augment SDK support (not yet available)
      res.write(toSSE(buildStreamChunk(ctx, '', model, true)));
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      // Non-streaming response
      const result = await service.generateCompletion(chatMessages, model, generationOptions);
      res.json(buildCompletionResponse(result.text, model, result.usage));
    }
  } catch (error) {
    console.error('[Chat] Error:', error);
    next(error);
  }
};

