/**
 * Named Webhook Handler
 *
 * Supports multiple named webhooks, each with its own configuration.
 * Each webhook can have different: model, system prompt, LLM backend.
 *
 * Routes:
 *   POST /webhook/:name - Call a specific named webhook
 *   GET  /webhooks      - List all configured webhooks
 */

import type { Request, Response, NextFunction } from 'express';
import OpenAI from 'openai';
import { WebhookRequestSchema } from '#types';
import { loadConfig, type WebhookConfig } from '#config';

/** Cache of OpenAI clients per webhook (keyed by baseURL + apiKey) */
const clientCache = new Map<string, OpenAI>();

/**
 * Get or create OpenAI client for a webhook configuration
 */
const getClientForWebhook = (webhook: WebhookConfig, defaultPort: number): OpenAI => {
  const baseURL = webhook.llmBaseUrl ?? `http://localhost:${String(defaultPort)}/v1`;
  const apiKey = webhook.llmApiKey;
  const cacheKey = `${baseURL}:${apiKey}`;

  const cached = clientCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const client = new OpenAI({ baseURL, apiKey });
  clientCache.set(cacheKey, client);
  return client;
};

/**
 * Extract the prompt text from various webhook payload formats
 */
const extractPrompt = (body: Record<string, unknown>): string | null => {
  const fields = ['text', 'prompt', 'message', 'query', 'content', 'input', 'value2', 'value1'];

  for (const field of fields) {
    const value = body[field];
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }

  return null;
};

/** Request params for webhook route */
interface WebhookParams {
  name: string;
}

/**
 * Handle named webhook requests
 * Route: POST /webhook/:name
 */
export const handleWebhook = async (
  req: Request<WebhookParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const config = loadConfig();
    const webhookName = req.params.name;

    // Find the webhook configuration
    const webhook = config.webhooks.find((w) => w.name === webhookName);
    if (webhook === undefined) {
      res.status(404).json({
        error: `Webhook '${webhookName}' not found`,
        available: config.webhooks.map((w) => w.name),
      });
      return;
    }

    if (!webhook.enabled) {
      res.status(503).json({ error: `Webhook '${webhookName}' is disabled` });
      return;
    }

    // Validate request body
    const parseResult = WebhookRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid webhook payload',
        details: parseResult.error.errors,
      });
      return;
    }

    const body = parseResult.data;
    const prompt = extractPrompt(body as Record<string, unknown>);

    if (prompt === null) {
      res.status(400).json({
        error: 'No prompt found in payload',
        hint: 'Send text in one of: text, prompt, message, query, content, input, value1, value2',
      });
      return;
    }

    // Use payload overrides, then webhook config, then global defaults
    const model = body.model ?? webhook.model ?? config.defaultModel;
    const systemPrompt = body.system_prompt ?? webhook.systemPrompt;

    console.log(`[Webhook:${webhookName}] Model: ${model}, PromptLength: ${String(prompt.length)}`);

    // Build messages array
    const messages: { role: 'system' | 'user'; content: string }[] = [];
    if (systemPrompt !== undefined) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    // Call OpenAI-compatible API (60s timeout instead of 10min default)
    const client = getClientForWebhook(webhook, config.port);
    const completion = await client.chat.completions.create(
      { model, messages },
      { timeout: 60_000 }
    );

    const firstChoice = completion.choices[0];
    const responseText = firstChoice?.message.content ?? '';

    res.json({
      success: true,
      webhook: webhookName,
      model,
      prompt,
      response: responseText,
      usage: completion.usage,
    });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    next(error);
  }
};

/**
 * List all configured webhooks
 * Route: GET /webhooks
 */
export const listWebhooks = (_req: Request, res: Response): void => {
  const config = loadConfig();

  const webhooks = config.webhooks.map((w) => ({
    name: w.name,
    description: w.description,
    enabled: w.enabled,
    model: w.model ?? config.defaultModel,
    hasSystemPrompt: w.systemPrompt !== undefined,
    llmBaseUrl: w.llmBaseUrl ?? `http://localhost:${String(config.port)}/v1`,
  }));

  res.json({
    count: webhooks.length,
    webhooks,
  });
};

