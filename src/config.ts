/**
 * Application Configuration
 * 
 * Single Responsibility: Manages all configuration loading and validation
 * Uses environment variables with sensible defaults
 */

import { z } from 'zod';

const ConfigSchema = z.object({
  port: z.coerce.number().int().positive().default(3456),
  host: z.string().default('0.0.0.0'),
  augment: z.object({
    apiToken: z.string().optional(),
    apiUrl: z.string().url().optional(),
  }),
  defaultModel: z.string().default('claude-sonnet-4-5'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): Config {
  return ConfigSchema.parse({
    port: process.env['PORT'],
    host: process.env['HOST'],
    augment: {
      apiToken: process.env['AUGMENT_API_TOKEN'],
      apiUrl: process.env['AUGMENT_API_URL'],
    },
    defaultModel: process.env['DEFAULT_MODEL'],
    logLevel: process.env['LOG_LEVEL'],
  });
}

/** Available models exposed by the proxy */
export const AVAILABLE_MODELS = [
  'claude-sonnet-4-5',
  'claude-haiku-4.5',
  'claude-opus-4',
  'gpt-5',
  'sonnet4',
] as const;

export type AvailableModel = (typeof AVAILABLE_MODELS)[number];

