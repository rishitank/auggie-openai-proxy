/**
 * Augment SDK Service
 * 
 * Wraps the @augmentcode/auggie-sdk to provide:
 * - Language model access via AugmentLanguageModel
 * - Context Engine for enhanced responses
 * - Credential management
 */

import { AugmentLanguageModel, resolveAugmentCredentials } from '@augmentcode/auggie-sdk';
import { generateText, streamText, CoreMessage } from 'ai';

interface AugmentCredentials {
  apiKey: string;
  apiUrl: string;
}

let credentials: AugmentCredentials | null = null;
let model: AugmentLanguageModel | null = null;

/**
 * Initialize the Augment SDK with credentials
 */
export async function initializeAugment(): Promise<void> {
  // Try environment variables first
  if (process.env.AUGMENT_API_TOKEN && process.env.AUGMENT_API_URL) {
    credentials = {
      apiKey: process.env.AUGMENT_API_TOKEN,
      apiUrl: process.env.AUGMENT_API_URL,
    };
    console.log('📝 Using credentials from environment variables');
  } else {
    // Fall back to resolving from session file
    try {
      const resolved = await resolveAugmentCredentials();
      credentials = {
        apiKey: resolved.apiKey,
        apiUrl: resolved.apiUrl,
      };
      console.log('📝 Using credentials from session file');
    } catch (error) {
      throw new Error(
        'Failed to resolve Augment credentials. Set AUGMENT_API_TOKEN and AUGMENT_API_URL or run `auggie login`'
      );
    }
  }

  // Create default model
  model = new AugmentLanguageModel('claude-sonnet-4-5', credentials);
}

/**
 * Get or create an AugmentLanguageModel for the specified model name
 */
export function getModel(modelName: string = 'claude-sonnet-4-5'): AugmentLanguageModel {
  if (!credentials) {
    throw new Error('Augment not initialized. Call initializeAugment() first.');
  }
  return new AugmentLanguageModel(modelName, credentials);
}

/**
 * Generate a chat completion (non-streaming)
 */
export async function generateChatCompletion(
  messages: CoreMessage[],
  modelName: string = 'claude-sonnet-4-5'
): Promise<{ text: string; usage?: { promptTokens: number; completionTokens: number } }> {
  const llm = getModel(modelName);
  
  const result = await generateText({
    model: llm,
    messages,
  });

  return {
    text: result.text,
    usage: result.usage ? {
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
    } : undefined,
  };
}

/**
 * Stream a chat completion
 */
export async function* streamChatCompletion(
  messages: CoreMessage[],
  modelName: string = 'claude-sonnet-4-5'
): AsyncGenerator<string, void, unknown> {
  const llm = getModel(modelName);
  
  const { textStream } = await streamText({
    model: llm,
    messages,
  });

  for await (const chunk of textStream) {
    yield chunk;
  }
}

/**
 * List available models
 */
export function getAvailableModels(): string[] {
  return [
    'claude-sonnet-4-5',
    'claude-haiku-4.5',
    'claude-opus-4',
    'gpt-5',
    'sonnet4',
  ];
}

export { credentials };

