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
import { loadConfig, validateEnvironment } from '#config';
import { VERSION, NAME } from '#version';
import { initializeAugment, getAugmentService } from '#services/augment';
import { initializeContextService, getContextService } from '#services/context';
import { handleChatCompletion, handleModelsList, handleWebhook, listWebhooks } from '#handlers/index';
import { errorHandler, requestLogger, requestTimeout, cors, metricsRecorder, securityHeaders, requestId } from '#middleware';
import { getPrometheusMetrics } from '#services/metrics';

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
      console.warn(`⚠️  ${warning}`);
    }

    console.log('🚀 Initializing Auggie SDK...');
    await initializeAugment();
    console.log('✅ Auggie SDK initialized');

    // Initialize context service if enabled
    console.log('🔍 Initializing context service...');
    await initializeContextService({
      enabled: config.context.enabled,
      workspaceDir: config.context.workspaceDir,
      stateFile: config.context.stateFile,
      maxFileSize: config.context.maxFileSize,
    });
    const contextService = getContextService();
    const contextStatus = contextService.isReady()
      ? `✅ Context enabled (${String(contextService.getIndexedPaths().length)} files indexed)`
      : '⏸️  Context disabled';
    console.log(contextStatus);

    const server = app.listen(config.port, config.host, () => {
      console.log(`\n🎉 Auggie OpenAI Proxy v${VERSION}`);
      console.log(`   Running at http://${config.host}:${String(config.port)}`);
      console.log(`\n📡 Endpoints:`);
      console.log(`   GET  /health              - Health check`);
      console.log(`   GET  /v1/models           - List available models`);
      console.log(`   POST /v1/chat/completions - Chat completions`);
      console.log(`   GET  /webhooks            - List configured webhooks`);
      console.log(`   POST /webhook/:name       - Call a named webhook`);
      console.log(`\n🔧 Context Enhancement: ${contextService.isReady() ? 'ENABLED' : 'DISABLED'}`);
      console.log(`\n🔗 Webhooks: ${String(config.webhooks.length)} configured`);
      for (const wh of config.webhooks) {
        const status = wh.enabled ? '✅' : '⏸️';
        console.log(`   ${status} ${wh.name}${wh.description !== undefined ? ` - ${wh.description}` : ''}`);
      }
      console.log(`\n💡 Moltbot config:`);
      console.log(`   baseUrl: "http://${config.host}:${String(config.port)}/v1"`);
      console.log(`   api: "openai-completions"`);
      console.log(`   models: claude-sonnet-4-5, claude-opus-4-5, claude-haiku-4-5, gpt-5\n`);
    });

    // Graceful shutdown handler
    const shutdown = (signal: string): void => {
      console.log(`\n⏳ Received ${signal}, shutting down gracefully...`);
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });

      // Force exit after 10 seconds if connections don't close
      setTimeout(() => {
        console.error('⚠️  Forced shutdown after timeout');
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
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

void main();

