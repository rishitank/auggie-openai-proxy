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
import { logger } from '#services/logger';
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
 * Default token details (Augment SDK doesn't provide these granular breakdowns)
 */
const DEFAULT_PROMPT_TOKENS_DETAILS = {
  cached_tokens: 0,
  audio_tokens: 0,
} as const;

const DEFAULT_COMPLETION_TOKENS_DETAILS = {
  reasoning_tokens: 0,
  audio_tokens: 0,
  accepted_prediction_tokens: 0,
  rejected_prediction_tokens: 0,
} as const;

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
          prompt_tokens_details: DEFAULT_PROMPT_TOKENS_DETAILS,
          completion_tokens_details: DEFAULT_COMPLETION_TOKENS_DETAILS,
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
 *
 * Per OpenAI spec, when include_usage=true:
 * - Intermediate chunks should have `usage: null`
 * - Final chunk should have actual usage data
 */
const buildStreamChunk = (
  ctx: StreamContext,
  content: string,
  model: string,
  isLast = false,
  usage?: TokenUsage | null
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

  logger.debug('Enhanced message with codebase context');
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
      const firstIssue = parseResult.error.issues[0];
      const errorMessage = firstIssue?.message ?? 'Invalid request';
      const errorPath = firstIssue?.path.join('.') ?? 'unknown';
      // Sanitize issues to avoid logging user-supplied values that may contain PII
      const sanitizedIssues = parseResult.error.issues.map((issue) => ({
        path: issue.path,
        code: issue.code,
        message: '<redacted>',
      }));
      logger.warn({ errorMessage, errorPath, issues: sanitizedIssues }, 'Chat validation failed');
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
      stream_options,
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
      logger.warn({ requestedModel }, 'Unknown model requested');
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
      logger.debug({ requestedModel, resolvedModel: model }, 'Model alias resolved');
    }

    // Log user identifier presence if provided (for analytics/abuse detection)
    // Note: We don't log the actual user value to avoid PII leakage
    if (user !== undefined) {
      logger.debug('User identifier provided');
    }

    // Log unsupported parameters that were provided
    const unsupportedParams: string[] = [];
    if (temperature !== undefined) unsupportedParams.push('temperature');
    if (top_p !== undefined) unsupportedParams.push('top_p');
    if (presence_penalty !== undefined) unsupportedParams.push('presence_penalty');
    if (frequency_penalty !== undefined) unsupportedParams.push('frequency_penalty');
    if (logprobs !== undefined) unsupportedParams.push('logprobs');

    if (unsupportedParams.length > 0) {
      logger.debug({ unsupportedParams }, 'Parameters not yet supported by Augment SDK');
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
      logger.debug({ maxOutputTokens }, 'Max output tokens configured');
    }

    const rawMessages = toChatMessages(messages);

    // Enhance with codebase context if available
    const chatMessages = await enhanceMessagesWithContext(rawMessages);

    const service = getAugmentService();

    logger.info({ model, messageCount: messages.length, stream }, 'Processing chat completion');

    if (stream) {
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Create stream context for consistent ID across all chunks
      const ctx = createStreamContext();

      // Check if usage should be included in streaming response
      const includeUsage = stream_options?.include_usage === true;

      // Stream chunks with usage tracking
      let streamingUsage: TokenUsage | undefined;
      for await (const chunk of service.streamCompletionWithUsage(chatMessages, model, generationOptions)) {
        if (chunk.type === 'text') {
          // Per OpenAI spec: intermediate chunks have usage: null when include_usage=true
          res.write(toSSE(buildStreamChunk(ctx, chunk.text, model, false, includeUsage ? null : undefined)));
        } else if (includeUsage) {
          // chunk.type === 'finish' - Always include usage when requested, with fallback to zeros
          const { inputTokens, outputTokens, totalTokens } = chunk.usage;
          streamingUsage = {
            prompt_tokens: inputTokens ?? 0,
            completion_tokens: outputTokens ?? 0,
            total_tokens: totalTokens ?? ((inputTokens ?? 0) + (outputTokens ?? 0)),
            prompt_tokens_details: DEFAULT_PROMPT_TOKENS_DETAILS,
            completion_tokens_details: DEFAULT_COMPLETION_TOKENS_DETAILS,
          };
        }
      }

      // Per OpenAI spec: finish chunk has usage: null when include_usage=true
      res.write(toSSE(buildStreamChunk(ctx, '', model, true, includeUsage ? null : undefined)));

      // Per OpenAI spec: additional usage-only chunk with choices: [] when include_usage=true
      if (streamingUsage !== undefined) {
        const usageChunk: StreamChunkResponse = {
          id: ctx.id,
          object: 'chat.completion.chunk',
          created: ctx.created,
          model,
          system_fingerprint: ctx.systemFingerprint,
          choices: [],
          usage: streamingUsage,
        };
        res.write(toSSE(usageChunk));
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      // Non-streaming response
      const result = await service.generateCompletion(chatMessages, model, generationOptions);
      res.json(buildCompletionResponse(result.text, model, result.usage));
    }
  } catch (error) {
    logger.error({ err: error }, 'Chat completion error');
    // If headers already sent (streaming in progress), gracefully end the stream
    if (res.headersSent) {
      try {
        res.write('data: [DONE]\n\n');
        res.end();
      } catch {
        res.end();
      }
    } else {
      next(error);
    }
  }
};

