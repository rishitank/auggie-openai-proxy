/**
 * Auggie SDK OpenAI-Compatible Proxy
 *
 * A lightweight proxy that exposes Augment Code's AI capabilities
 * through an OpenAI-compatible API interface.
 *
 * Architecture:
 * - Express.js for HTTP handling
 * - Zod for request validation
 * - AugmentService for AI operations
 * - ContextService for codebase context enhancement
 *
 * Principles:
 * - SOLID: Single responsibility per module
 * - KISS: Simple, focused implementation
 * - DRY: Shared types and utilities
 */

import compression from 'compression';
import express, { type Request, type Response } from 'express';
import { loadConfig, validateEnvironment, AVAILABLE_MODELS } from '#config';
import { VERSION, NAME } from '#version';
import { initializeAugment, getAugmentService } from '#services/augment';
import { initializeContextService, getContextService } from '#services/context';
import { handleChatCompletion, handleModelsList, handleWebhook, listWebhooks } from '#handlers/index';
import {
  errorHandler,
  requestLogger,
  requestTimeout,
  cors,
  metricsRecorder,
  securityHeaders,
  requestId,
  rateLimiter,
  apiKeyAuth,
} from '#middleware';
import { getPrometheusMetrics } from '#services/metrics';
import { logger } from '#services/logger';

// =============================================================================
// Application Setup
// =============================================================================

const config = loadConfig();
const app = express();

// Middleware
app.use(securityHeaders);
app.use(requestId);
app.use(cors);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);
app.use(metricsRecorder);
app.use(requestTimeout());
app.use(apiKeyAuth); // API key auth (enabled when API_KEYS env var is set)
app.use(rateLimiter()); // Rate limiting (configurable via RATE_LIMIT_* env vars)

// =============================================================================
// Routes
// =============================================================================

/** Health check endpoint */
app.get('/health', (_req: Request, res: Response) => {
  const contextService = getContextService();
  const augmentReady = getAugmentService().isInitialized;
  const contextReady = contextService.isReady();
  const allHealthy = augmentReady;

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    service: NAME,
    version: VERSION,
    timestamp: new Date().toISOString(),
    checks: {
      augment: augmentReady ? 'ok' : 'not initialized',
      context: contextReady ? 'ok' : 'disabled',
    },
  });
});

/** Prometheus metrics endpoint */
app.get('/metrics', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  res.send(getPrometheusMetrics());
});

/** OpenAI-compatible endpoints */
app.get('/v1/models', handleModelsList);
app.post('/v1/chat/completions', handleChatCompletion);

/** Named webhooks - each webhook has its own configuration */
app.get('/webhooks', listWebhooks);
app.post('/webhook/:name', handleWebhook);

// Error handler (must be last)
app.use(errorHandler);

// =============================================================================
// Server Startup
// =============================================================================

async function main(): Promise<void> {
  try {
    // Validate environment
    const warnings = validateEnvironment();
    for (const warning of warnings) {
      logger.warn({ warning }, 'Configuration warning');
    }

    logger.info('Initializing Auggie SDK...');
    await initializeAugment();
    logger.info('Auggie SDK initialized');

    // Initialize context service if enabled
    logger.info('Initializing context service...');
    await initializeContextService({
      enabled: config.context.enabled,
      workspaceDir: config.context.workspaceDir,
      stateFile: config.context.stateFile,
      maxFileSize: config.context.maxFileSize,
    });
    const contextService = getContextService();
    const indexedFiles = contextService.getIndexedPaths().length;
    logger.info(
      { enabled: contextService.isReady(), indexedFiles },
      contextService.isReady() ? 'Context service enabled' : 'Context service disabled'
    );

    const server = app.listen(config.port, config.host, () => {
      logger.info(
        {
          version: VERSION,
          host: config.host,
          port: config.port,
          contextEnabled: contextService.isReady(),
          webhooksCount: config.webhooks.length,
        },
        `Auggie OpenAI Proxy v${VERSION} started`
      );

      // Log startup info to console for visibility
      console.log(`\n🎉 Auggie OpenAI Proxy v${VERSION}`);
      console.log(`   Running at http://${config.host}:${String(config.port)}`);
      console.log(`\n📡 Endpoints:`);
      console.log(`   GET  /health              - Health check`);
      console.log(`   GET  /metrics             - Prometheus metrics`);
      console.log(`   GET  /v1/models           - List available models`);
      console.log(`   POST /v1/chat/completions - Chat completions`);
      console.log(`   GET  /webhooks            - List configured webhooks`);
      console.log(`   POST /webhook/:name       - Call a named webhook`);
      console.log(`\n🔧 Context Enhancement: ${contextService.isReady() ? 'ENABLED' : 'DISABLED'}`);
      const apiKeysConfigured = process.env.API_KEYS !== undefined && process.env.API_KEYS.trim() !== '';
      console.log(`🔐 API Key Auth: ${apiKeysConfigured ? 'ENABLED' : 'DISABLED (open access)'}`);
      // Read rate limit config from env (same defaults as middleware)
      const rlWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? '60000');
      const rlMaxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? '100');
      const rlWindowSec = Math.round(rlWindowMs / 1000);
      console.log(`⏱️  Rate Limiting: ENABLED (${String(rlMaxRequests)} req/${String(rlWindowSec)}s)`);
      console.log(`\n🔗 Webhooks: ${String(config.webhooks.length)} configured`);
      for (const wh of config.webhooks) {
        const status = wh.enabled ? '✅' : '⏸️';
        console.log(`   ${status} ${wh.name}${wh.description !== undefined ? ` - ${wh.description}` : ''}`);
      }
      console.log(`\n💡 Client config:`);
      console.log(`   baseUrl: "http://${config.host}:${String(config.port)}/v1"`);
      console.log(`   api: "openai-completions"`);
      console.log(`   models: ${AVAILABLE_MODELS.join(', ')}\n`);
    });

    // Graceful shutdown handler
    const shutdown = (signal: string): void => {
      logger.info({ signal }, 'Shutdown signal received');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });

      // Force exit after 10 seconds if connections don't close
      setTimeout(() => {
        logger.fatal('Forced shutdown after timeout');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => {
      shutdown('SIGTERM');
    });
    process.on('SIGINT', () => {
      shutdown('SIGINT');
    });
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

void main();

