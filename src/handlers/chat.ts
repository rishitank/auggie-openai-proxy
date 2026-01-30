/**
 * Chat Completions Handler
 * 
 * Implements OpenAI-compatible /v1/chat/completions endpoint
 * using the Augment SDK.
 */

import { Request, Response, NextFunction } from 'express';
import { generateChatCompletion, streamChatCompletion } from '../services/augment.js';
import { CoreMessage } from 'ai';
import { randomUUID } from 'crypto';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

/**
 * Convert OpenAI message format to Vercel AI SDK format
 */
function convertMessages(messages: OpenAIMessage[]): CoreMessage[] {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}

/**
 * Create OpenAI-compatible response format
 */
function createCompletionResponse(
  text: string,
  model: string,
  usage?: { promptTokens: number; completionTokens: number }
) {
  return {
    id: `chatcmpl-${randomUUID()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: text,
        },
        finish_reason: 'stop',
      },
    ],
    usage: usage ? {
      prompt_tokens: usage.promptTokens,
      completion_tokens: usage.completionTokens,
      total_tokens: usage.promptTokens + usage.completionTokens,
    } : undefined,
  };
}

/**
 * Create streaming SSE chunk
 */
function createStreamChunk(content: string, model: string, isLast: boolean = false) {
  const chunk = {
    id: `chatcmpl-${randomUUID()}`,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        delta: isLast ? {} : { content },
        finish_reason: isLast ? 'stop' : null,
      },
    ],
  };
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

/**
 * Non-streaming chat completion handler
 */
export function createChatCompletionHandler() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as ChatCompletionRequest;
      const { model, messages, stream } = body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
          error: { message: 'messages is required and must be a non-empty array', type: 'invalid_request_error' },
        });
      }

      const coreMessages = convertMessages(messages);
      const modelName = model || 'claude-sonnet-4-5';

      console.log(`[Chat] Model: ${modelName}, Messages: ${messages.length}, Stream: ${stream}`);

      if (stream) {
        // Streaming response
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        for await (const chunk of streamChatCompletion(coreMessages, modelName)) {
          res.write(createStreamChunk(chunk, modelName));
        }

        res.write(createStreamChunk('', modelName, true));
        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        // Non-streaming response
        const result = await generateChatCompletion(coreMessages, modelName);
        res.json(createCompletionResponse(result.text, modelName, result.usage));
      }
    } catch (error) {
      console.error('[Chat] Error:', error);
      next(error);
    }
  };
}

/**
 * Alias for streaming handler
 */
export const createStreamingHandler = createChatCompletionHandler;

