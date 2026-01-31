/**
 * Application Configuration
 *
 * Single Responsibility: Manages all configuration loading and validation
 * Uses environment variables with sensible defaults
 */

import { z } from 'zod';
import { WebhookConfigSchema, type WebhookConfig } from '#types';

const ConfigSchema = z.object({
  port: z.coerce.number().int().positive().default(3456),
  host: z.string().default('0.0.0.0'),
  augment: z.object({
    apiToken: z.string().optional(),
    apiUrl: z.string().url().optional(),
  }),
  defaultModel: z.string().default('claude-sonnet-4-5'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  context: z.object({
    enabled: z.coerce.boolean().default(false),
    workspaceDir: z.string().optional(),
    stateFile: z.string().optional(),
    maxFileSize: z.coerce.number().int().positive().default(100 * 1024), // 100KB
  }),
  webhooks: z.array(WebhookConfigSchema).default([]),
});

export type { WebhookConfig };
export type Config = z.infer<typeof ConfigSchema>;

/**
 * Parse WEBHOOKS JSON from environment variable
 * Format: [{"name": "assistant", "model": "claude-sonnet-4-5", "systemPrompt": "..."}]
 */
function parseWebhooksFromEnv(): z.infer<typeof WebhookConfigSchema>[] {
  const webhooksJson = process.env.WEBHOOKS;
  if (webhooksJson === undefined || webhooksJson === '') {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(webhooksJson);
    if (!Array.isArray(parsed)) {
      console.warn('[Config] WEBHOOKS must be a JSON array, ignoring');
      return [];
    }
    // Validate each webhook through Zod to apply defaults and catch errors
    const seen = new Set<string>();
    return parsed
      .map((item, index) => {
        const result = WebhookConfigSchema.safeParse(item);
        if (!result.success) {
          console.warn(
            `[Config] Invalid webhook at index ${String(index)}, skipping:`,
            result.error.errors
          );
          return null;
        }
        return result.data;
      })
      .filter((w): w is z.infer<typeof WebhookConfigSchema> => w !== null)
      .filter((w) => {
        if (seen.has(w.name)) {
          console.warn(`[Config] Duplicate webhook name '${w.name}', skipping`);
          return false;
        }
        seen.add(w.name);
        return true;
      });
  } catch {
    console.warn('[Config] Failed to parse WEBHOOKS JSON, ignoring');
    return [];
  }
}

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): Config {
  return ConfigSchema.parse({
    port: process.env.PORT,
    host: process.env.HOST,
    augment: {
      apiToken: process.env.AUGMENT_API_TOKEN,
      apiUrl: process.env.AUGMENT_API_URL,
    },
    defaultModel: process.env.DEFAULT_MODEL,
    logLevel: process.env.LOG_LEVEL,
    context: {
      enabled: process.env.CONTEXT_ENABLED,
      workspaceDir: process.env.CONTEXT_WORKSPACE_DIR,
      stateFile: process.env.CONTEXT_STATE_FILE,
      maxFileSize: process.env.CONTEXT_MAX_FILE_SIZE,
    },
    webhooks: parseWebhooksFromEnv(),
  });
}

/**
 * Available models exposed by the proxy
 *
 * These are the model IDs for AugmentLanguageModel (AI SDK Provider).
 * See: https://docs.augmentcode.com/models/available-models
 */
export const AVAILABLE_MODELS = [
  'claude-sonnet-4-5',   // Claude Sonnet 4.5 (default, best balance)
  'claude-haiku-4-5',    // Claude Haiku 4.5 (fast, lightweight)
  'claude-opus-4-5',     // Claude Opus 4.5 (most capable)
  'claude-sonnet-4',     // Claude Sonnet 4 (previous gen)
  'gpt-5',               // OpenAI GPT-5
] as const;

export type AvailableModel = (typeof AVAILABLE_MODELS)[number];

