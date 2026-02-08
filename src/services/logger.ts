/**
 * Structured Logger Service
 *
 * Single Responsibility: Provides structured JSON logging via pino
 * Supports log levels, request correlation, and production-ready formatting
 */

import pino from 'pino';

/** Log levels supported by the logger */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent';

/** Default log level based on environment */
const DEFAULT_LOG_LEVEL: LogLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

/** Parse log level from environment variable */
const parseLogLevel = (level: string | undefined): LogLevel => {
  const validLevels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'];
  if (level !== undefined && level !== '' && validLevels.includes(level as LogLevel)) {
    return level as LogLevel;
  }
  return DEFAULT_LOG_LEVEL;
};

/** Determine if we should use pretty printing (development) */
const usePrettyPrint = (): boolean => {
  // Use pretty print in development unless explicitly disabled
  if (process.env.LOG_FORMAT === 'json') return false;
  if (process.env.NODE_ENV === 'production') return false;
  return true;
};

/** Create the pino logger instance */
const createLogger = (): pino.Logger => {
  const level = parseLogLevel(process.env.LOG_LEVEL);

  const options: pino.LoggerOptions = {
    level,
    // Add timestamp in ISO format
    timestamp: pino.stdTimeFunctions.isoTime,
    // Base context for all logs
    base: {
      service: 'auggie-openai-proxy',
      pid: process.pid,
    },
    // Format level as string instead of number
    formatters: {
      level: (label) => ({ level: label }),
    },
  };

  // Use pino-pretty for development
  if (usePrettyPrint()) {
    return pino({
      ...options,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname,service',
        },
      },
    });
  }

  return pino(options);
};

/** Singleton logger instance */
export const logger = createLogger();

/** Create a child logger with additional context */
export const createChildLogger = (context: Record<string, unknown>): pino.Logger =>
  logger.child(context);

/** Create a request-scoped logger with request ID */
export const createRequestLogger = (requestId: string): pino.Logger =>
  logger.child({ requestId });

/**
 * Redact sensitive fields from objects before logging
 * Prevents accidental logging of API keys, tokens, etc.
 */
export const redactSensitive = <T extends Record<string, unknown>>(obj: T): T => {
  const sensitivePatterns = ['apikey', 'api_key', 'token', 'password', 'secret', 'authorization'];
  const redacted = { ...obj };

  for (const key of Object.keys(redacted)) {
    const lowerKey = key.toLowerCase();
    if (sensitivePatterns.some((pattern) => lowerKey.includes(pattern))) {
      (redacted as Record<string, unknown>)[key] = '[REDACTED]';
    }
  }

  return redacted;
};

export default logger;

