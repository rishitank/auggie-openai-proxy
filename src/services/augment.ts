/**
 * Augment SDK Service
 *
 * Single Responsibility: Manages Augment SDK interactions
 * Open/Closed: Extensible via AugmentService class, closed for modification
 * Dependency Inversion: Depends on abstractions (interfaces), not concretions
 */

import { AugmentLanguageModel, resolveAugmentCredentials } from '@augmentcode/auggie-sdk';
import { generateText, streamText, type CoreMessage, type LanguageModel } from 'ai';
import type { AugmentCredentials, ChatCompletionResult } from '../types/index.js';
import { AVAILABLE_MODELS } from '../config.js';

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
    if (envToken && envUrl) {
      this.credentials = { apiKey: envToken, apiUrl: envUrl };
      console.log('📝 Using credentials from environment variables');
      return;
    }

    try {
      const resolved = await resolveAugmentCredentials();
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
    if (!this.credentials) {
      throw new Error('AugmentService not initialized. Call initialize() first.');
    }
    return new AugmentLanguageModel(modelName, this.credentials);
  }

  /**
   * Generate a chat completion (non-streaming)
   *
   * Note: Type assertion via unknown is needed because @augmentcode/auggie-sdk
   * may not be fully aligned with the latest AI SDK LanguageModelV1 interface.
   * This is safe as AugmentLanguageModel implements the required methods.
   */
  async generateCompletion(
    messages: CoreMessage[],
    modelName: string
  ): Promise<ChatCompletionResult> {
    const model = this.createModel(modelName);
    const result = await generateText({
      model: model as unknown as LanguageModel,
      messages,
    });

    return {
      text: result.text,
      usage: result.usage
        ? { promptTokens: result.usage.promptTokens, completionTokens: result.usage.completionTokens }
        : undefined,
    };
  }

  /**
   * Stream a chat completion
   *
   * Note: Type assertion via unknown is needed because @augmentcode/auggie-sdk
   * may not be fully aligned with the latest AI SDK LanguageModelV1 interface.
   */
  async *streamCompletion(
    messages: CoreMessage[],
    modelName: string
  ): AsyncGenerator<string, void, unknown> {
    const model = this.createModel(modelName);
    const { textStream } = streamText({
      model: model as unknown as LanguageModel,
      messages,
    });

    for await (const chunk of textStream) {
      yield chunk;
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
  if (!serviceInstance) {
    serviceInstance = new AugmentService();
  }
  return serviceInstance;
}

/**
 * Initialize the Augment service (convenience function)
 */
export async function initializeAugment(): Promise<void> {
  const service = getAugmentService();
  await service.initialize(
    process.env['AUGMENT_API_TOKEN'],
    process.env['AUGMENT_API_URL']
  );
}

