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
 *
 * Principles:
 * - SOLID: Single responsibility per module
 * - KISS: Simple, focused implementation
 * - DRY: Shared types and utilities
 */

import express, { type Request, type Response } from 'express';
import { loadConfig } from './config.js';
import { initializeAugment } from './services/augment.js';
import { handleChatCompletion, handleModelsList, handleIFTTTWebhook } from './handlers/index.js';
import { errorHandler, requestLogger } from './middleware/index.js';

// =============================================================================
// Application Setup
// =============================================================================

const config = loadConfig();
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

// =============================================================================
// Routes
// =============================================================================

/** Health check endpoint */
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'auggie-openai-proxy',
    version: '1.1.0',
    timestamp: new Date().toISOString(),
  });
});

/** OpenAI-compatible endpoints */
app.get('/v1/models', handleModelsList);
app.post('/v1/chat/completions', handleChatCompletion);

/** IFTTT webhook for Google Assistant */
app.post('/ifttt/webhook', handleIFTTTWebhook);

// Error handler (must be last)
app.use(errorHandler);

// =============================================================================
// Server Startup
// =============================================================================

async function main(): Promise<void> {
  try {
    console.log('🚀 Initializing Auggie SDK...');
    await initializeAugment();
    console.log('✅ Auggie SDK initialized');

    app.listen(config.port, config.host, () => {
      console.log(`\n🎉 Auggie OpenAI Proxy v1.1.0`);
      console.log(`   Running at http://${config.host}:${config.port}`);
      console.log(`\n📡 Endpoints:`);
      console.log(`   GET  /health              - Health check`);
      console.log(`   GET  /v1/models           - List available models`);
      console.log(`   POST /v1/chat/completions - Chat completions`);
      console.log(`   POST /ifttt/webhook       - Google Assistant webhook`);
      console.log(`\n💡 Clawdbot config:`);
      console.log(`   baseUrl: "http://${config.host}:${config.port}/v1"`);
      console.log(`   api: "openai-completions"\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

main();

