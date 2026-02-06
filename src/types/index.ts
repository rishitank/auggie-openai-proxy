/**
 * Type definitions for the Auggie OpenAI Proxy
 *
 * Following Interface Segregation Principle (ISP) - small, focused interfaces
 */

import { z } from 'zod';

// =============================================================================
// Enums
// =============================================================================

/** Message roles for chat completions */
export enum MessageRole {
  System = 'system',
  User = 'user',
  Assistant = 'assistant',
  Developer = 'developer', // OpenAI-specific, maps to System for Augment SDK
  Tool = 'tool', // Tool call results - filtered out before sending to Augment
  Function = 'function', // Legacy function call results - filtered out before sending to Augment
}

/** Content types for language model messages */
export enum ContentType {
  Text = 'text',
}

// =============================================================================
// OpenAI API Types (Request/Response schemas)
// =============================================================================

/** OpenAI message role schema (for Zod validation) */
export const MessageRoleSchema = z.enum(MessageRole);

/**
 * Content can be either a string or an array of content parts
 * OpenAI supports: { type: 'text', text: string } or { type: 'image_url', ... }
 * We accept any content part via passthrough but only extract text during normalization
 */
const _TextContentPartSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
});
type TextContentPart = z.infer<typeof _TextContentPartSchema>;

/** Any content part - we use loose() to accept image_url and other types */
const AnyContentPartSchema = z
  .object({
    type: z.string(),
  })
  .loose();

const ContentSchema = z.union([
  z.string(),
  z.array(AnyContentPartSchema), // Accept any content parts (text, image_url, etc.)
]);

/**
 * OpenAI chat message - supports both string and array content
 * Uses loose() to allow additional fields like tool_call_id, name, etc.
 * that are present in tool/function messages
 */
export const OpenAIMessageSchema = z
  .object({
    role: MessageRoleSchema,
    content: ContentSchema.nullable(), // Tool messages can have null content
  })
  .loose();

/** Normalized message with string content */
export interface OpenAIMessage {
  readonly role: MessageRole;
  readonly content: string;
}

/** Input type for normalizeMessageContent - accepts any content format */
interface NormalizableMessage {
  role: MessageRole;
  content: string | { type: string; [key: string]: unknown }[] | null;
}

/** Type guard to check if a content part is a text part */
const isTextPart = (part: { type: string; [key: string]: unknown }): part is TextContentPart =>
  part.type === 'text' && typeof (part as { text?: unknown }).text === 'string';

/**
 * Normalize OpenAI message content to string
 * Handles string content, array content, and null content formats
 * Filters out non-text content parts (e.g., image_url) gracefully
 */
export const normalizeMessageContent = (msg: NormalizableMessage): OpenAIMessage => {
  const content = msg.content;
  // Handle null content (common for tool messages with only tool_call_id)
  if (content === null) {
    return { role: msg.role, content: '' };
  }
  if (typeof content === 'string') {
    return { role: msg.role, content };
  }
  // Extract text from content array, filtering out non-text parts (like image_url)
  const textParts = content.filter(isTextPart).map((part) => part.text);
  return { role: msg.role, content: textParts.join('') };
};

/**
 * Stream options for including usage in streaming responses
 */
export const StreamOptionsSchema = z.object({
  include_usage: z.boolean().default(false),
});

/**
 * Chat completion request body
 * Uses passthrough() to allow additional OpenAI fields like tools, response_format, etc.
 * that we don't explicitly handle but shouldn't reject
 */
export const ChatCompletionRequestSchema = z
  .object({
    model: z.string().optional().default('claude-sonnet-4-5'),
    messages: z
      .array(OpenAIMessageSchema)
      .min(1, 'messages must be a non-empty array'),
    stream: z.boolean().optional().default(false),
    // Stream options for including usage in streaming responses
    stream_options: StreamOptionsSchema.optional(),
    // Sampling parameters
    temperature: z.number().min(0).max(2).optional(),
    top_p: z.number().min(0).max(1).optional(),
    // Token limits
    max_tokens: z.number().positive().optional(),
    max_completion_tokens: z.number().positive().optional(), // OpenAI alias for max_tokens
    // Penalty parameters
    presence_penalty: z.number().min(-2).max(2).optional(),
    frequency_penalty: z.number().min(-2).max(2).optional(),
    // Stop sequences
    stop: z.union([z.string(), z.array(z.string()).max(4)]).optional(),
    // Multiple completions (currently only n=1 supported)
    n: z.number().int().min(1).max(1).optional().default(1),
    // User identifier for abuse detection
    user: z.string().optional(),
    // Seed for deterministic sampling (if supported)
    seed: z.number().int().optional(),
    // Log probabilities (not yet supported)
    logprobs: z.boolean().optional(),
    top_logprobs: z.number().int().min(0).max(20).optional(),
  })
  .loose(); // Allow additional OpenAI fields (tools, response_format, tool_choice, etc.)
export type ChatCompletionRequest = z.infer<typeof ChatCompletionRequestSchema>;

/**
 * Webhook request body
 * Supports multiple formats from various automation platforms
 */
export const WebhookRequestSchema = z
  .object({
    // IFTTT format
    value1: z.string().optional(),
    value2: z.string().optional(),
    value3: z.string().optional(),
    // Zapier/Make format
    message: z.string().optional(),
    query: z.string().optional(),
    // Generic format
    prompt: z.string().optional(),
    input: z.string().optional(),
    content: z.string().optional(),
    text: z.string().optional(),
    // Optional overrides (can override webhook defaults)
    model: z.string().optional(),
    system_prompt: z.string().optional(),
  })
  .refine(
    (data) =>
      [
        data.text,
        data.prompt,
        data.message,
        data.query,
        data.content,
        data.input,
        data.value1,
        data.value2,
        data.value3,
      ].some((v) => typeof v === 'string' && v.trim() !== ''),
    { message: 'At least one message field is required' }
  );
export type WebhookRequest = z.infer<typeof WebhookRequestSchema>;

/**
 * Named webhook configuration
 */
export const WebhookConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  // LLM settings
  llmBaseUrl: z.string().optional(), // Defaults to this proxy
  llmApiKey: z.string().default('not-needed'),
  model: z.string().optional(), // Defaults to global defaultModel
  systemPrompt: z.string().optional(),
});
export type WebhookConfig = z.infer<typeof WebhookConfigSchema>;

// =============================================================================
// Response Types
// =============================================================================

/** Finish reasons for completions */
export enum FinishReason {
  Stop = 'stop',
  Length = 'length',
}

/** Chat completion choice */
export interface ChatCompletionChoice {
  readonly index: number;
  readonly message: {
    readonly role: MessageRole.Assistant;
    readonly content: string;
  };
  readonly finish_reason: FinishReason | null;
}

/** Token usage details for prompt tokens */
export interface PromptTokensDetails {
  readonly cached_tokens?: number;
  readonly audio_tokens?: number;
}

/** Token usage details for completion tokens */
export interface CompletionTokensDetails {
  readonly reasoning_tokens?: number;
  readonly audio_tokens?: number;
  readonly accepted_prediction_tokens?: number;
  readonly rejected_prediction_tokens?: number;
}

/** Token usage statistics */
export interface TokenUsage {
  readonly prompt_tokens: number;
  readonly completion_tokens: number;
  readonly total_tokens: number;
  readonly prompt_tokens_details?: PromptTokensDetails;
  readonly completion_tokens_details?: CompletionTokensDetails;
}

/** Chat completion response */
export interface ChatCompletionResponse {
  readonly id: string;
  readonly object: 'chat.completion';
  readonly created: number;
  readonly model: string;
  readonly system_fingerprint: string;
  readonly choices: readonly ChatCompletionChoice[];
  readonly usage?: TokenUsage;
}

/** Streaming chunk delta */
export interface StreamDelta {
  readonly content?: string;
}

/** Streaming chunk choice */
export interface StreamChunkChoice {
  readonly index: number;
  readonly delta: StreamDelta;
  readonly finish_reason: FinishReason.Stop | null;
}

/** Streaming chunk response */
export interface StreamChunkResponse {
  readonly id: string;
  readonly object: 'chat.completion.chunk';
  readonly created: number;
  readonly model: string;
  readonly system_fingerprint: string;
  readonly choices: readonly StreamChunkChoice[];
  readonly usage?: TokenUsage;
}

/** Model info for /v1/models endpoint */
export interface ModelInfo {
  readonly id: string;
  readonly object: 'model';
  readonly created: number;
  readonly owned_by: string;
}

/** Models list response */
export interface ModelsListResponse {
  readonly object: 'list';
  readonly data: readonly ModelInfo[];
}

// =============================================================================
// Service Types
// =============================================================================

/** Augment credentials */
export interface AugmentCredentials {
  readonly apiKey: string;
  readonly apiUrl: string;
}

/** Chat completion result from Augment service */
export interface ChatCompletionResult {
  readonly text: string;
  readonly usage?: {
    readonly promptTokens: number;
    readonly completionTokens: number;
  };
}

/** OpenAI-style error response */
export interface OpenAIErrorResponse {
  readonly error: {
    readonly message: string;
    readonly type: string;
    readonly code: string;
  };
}

/** OpenAI error types */
export type OpenAIErrorType =
  | 'invalid_request_error'
  | 'authentication_error'
  | 'permission_error'
  | 'not_found_error'
  | 'rate_limit_error'
  | 'server_error'
  | 'timeout_error'
  | 'service_unavailable_error';

/**
 * Create a standardized OpenAI-compatible error response
 */
export const createErrorResponse = (
  message: string,
  type: OpenAIErrorType,
  code: string
): OpenAIErrorResponse => ({
  error: {
    message,
    type,
    code,
  },
});

