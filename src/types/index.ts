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
}

/** Content types for language model messages */
export enum ContentType {
  Text = 'text',
}

// =============================================================================
// OpenAI API Types (Request/Response schemas)
// =============================================================================

/** OpenAI message role schema (for Zod validation) */
export const MessageRoleSchema = z.nativeEnum(MessageRole);

/** OpenAI chat message */
export const OpenAIMessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string(),
});
export type OpenAIMessage = z.infer<typeof OpenAIMessageSchema>;

/** Chat completion request body */
export const ChatCompletionRequestSchema = z.object({
  model: z.string().optional().default('claude-sonnet-4-5'),
  messages: z.array(OpenAIMessageSchema).min(1, 'messages must be a non-empty array'),
  stream: z.boolean().optional().default(false),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().positive().optional(),
});
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
      Boolean(data.text) ||
      Boolean(data.prompt) ||
      Boolean(data.message) ||
      Boolean(data.query) ||
      Boolean(data.content) ||
      Boolean(data.input) ||
      Boolean(data.value1) ||
      Boolean(data.value2),
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

/** Token usage statistics */
export interface TokenUsage {
  readonly prompt_tokens: number;
  readonly completion_tokens: number;
  readonly total_tokens: number;
}

/** Chat completion response */
export interface ChatCompletionResponse {
  readonly id: string;
  readonly object: 'chat.completion';
  readonly created: number;
  readonly model: string;
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
  readonly choices: readonly StreamChunkChoice[];
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

