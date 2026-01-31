/**
 * Augment SDK Service
 *
 * Single Responsibility: Manages Augment SDK interactions
 * Open/Closed: Extensible via AugmentService class, closed for modification
 * Dependency Inversion: Depends on abstractions (interfaces), not concretions
 *
 * This module uses the AugmentLanguageModel directly via its doGenerate/doStream
 * methods to avoid AI SDK version conflicts.
 */

import {
  AugmentLanguageModel,
  resolveAugmentCredentials,
  type AugmentCredentials as SdkCredentials,
} from '@augmentcode/auggie-sdk';
import {
  MessageRole,
  ContentType,
  type AugmentCredentials,
  type ChatCompletionResult,
} from '#types';
import { AVAILABLE_MODELS } from '#config';

/** Message format compatible with Augment SDK */
interface ChatMessage {
  readonly role: MessageRole;
  readonly content: string;
}

/** LanguageModelV2 message types */
interface SystemMessage {
  role: MessageRole.System;
  content: string;
}
interface UserMessage {
  role: MessageRole.User;
  content: { type: ContentType.Text; text: string }[];
}
interface AssistantMessage {
  role: MessageRole.Assistant;
  content: { type: ContentType.Text; text: string }[];
}
type LMV2Message = SystemMessage | UserMessage | AssistantMessage;

/**
 * Convert a ChatMessage to the proper LanguageModelV2 message format
 */
const toLanguageModelMessage = (msg: ChatMessage): LMV2Message => {
  switch (msg.role) {
    case MessageRole.System:
      return { role: MessageRole.System, content: msg.content };
    case MessageRole.User:
      return {
        role: MessageRole.User,
        content: [{ type: ContentType.Text, text: msg.content }],
      };
    case MessageRole.Assistant:
      return {
        role: MessageRole.Assistant,
        content: [{ type: ContentType.Text, text: msg.content }],
      };
  }
};

/**
 * Service class for Augment SDK operations
 * Encapsulates all Augment-related functionality
 */
export class AugmentService {
  private credentials: AugmentCredentials | null = null;

  /**
   * Initialize the service with credentials
   * Tries environment variables first, then falls back to session file
   */
  async initialize(envToken?: string, envUrl?: string): Promise<void> {
    if (envToken !== undefined && envToken !== '' && envUrl !== undefined && envUrl !== '') {
      this.credentials = { apiKey: envToken, apiUrl: envUrl };
      console.log('📝 Using credentials from environment variables');
      return;
    }

    try {
      const resolved: SdkCredentials = await resolveAugmentCredentials();
      this.credentials = { apiKey: resolved.apiKey, apiUrl: resolved.apiUrl };
      console.log('📝 Using credentials from session file');
    } catch {
      throw new Error(
        'Failed to resolve Augment credentials. Set AUGMENT_API_TOKEN and AUGMENT_API_URL or run `auggie login`'
      );
    }
  }

  /**
   * Check if service is initialized
   */
  get isInitialized(): boolean {
    return this.credentials !== null;
  }

  /**
   * Create a language model instance for the specified model name
   */
  private createModel(modelName: string): AugmentLanguageModel {
    if (this.credentials === null) {
      throw new Error('AugmentService not initialized. Call initialize() first.');
    }
    return new AugmentLanguageModel(modelName, this.credentials);
  }

  /**
   * Generate a chat completion (non-streaming)
   *
   * Uses doGenerate directly to avoid AI SDK version conflicts.
   */
  async generateCompletion(
    messages: readonly ChatMessage[],
    modelName: string
  ): Promise<ChatCompletionResult> {
    const model = this.createModel(modelName);
    const prompt = messages.map(toLanguageModelMessage);

    // Call doGenerate directly on the language model
    const result = await model.doGenerate({ prompt });

    // Extract text from content array
    const textContent = result.content
      .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
      .map((c) => c.text)
      .join('');

    // Safely extract token counts
    const inputTokens = result.usage.inputTokens ?? 0;
    const outputTokens = result.usage.outputTokens ?? 0;

    return {
      text: textContent,
      usage:
        inputTokens > 0 || outputTokens > 0
          ? { promptTokens: inputTokens, completionTokens: outputTokens }
          : undefined,
    };
  }

  /**
   * Stream a chat completion
   *
   * Uses doStream directly to avoid AI SDK version conflicts.
   */
  async *streamCompletion(
    messages: readonly ChatMessage[],
    modelName: string
  ): AsyncGenerator<string, void, undefined> {
    const model = this.createModel(modelName);
    const prompt = messages.map(toLanguageModelMessage);

    // Call doStream directly on the language model
    const { stream } = await model.doStream({ prompt });

    const reader = stream.getReader();

    try {
      let result = await reader.read();
      while (!result.done) {
        // Only yield text deltas
        if (result.value.type === 'text-delta') {
          yield result.value.delta;
        }
        result = await reader.read();
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Get list of available models
   */
  getAvailableModels(): readonly string[] {
    return AVAILABLE_MODELS;
  }
}

// Singleton instance for the application
let serviceInstance: AugmentService | null = null;

/**
 * Get or create the AugmentService singleton
 */
export function getAugmentService(): AugmentService {
  serviceInstance ??= new AugmentService();
  return serviceInstance;
}

/**
 * Initialize the Augment service (convenience function)
 */
export async function initializeAugment(): Promise<void> {
  const service = getAugmentService();
  await service.initialize(
    process.env.AUGMENT_API_TOKEN,
    process.env.AUGMENT_API_URL
  );
}

