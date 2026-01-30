/**
 * Auggie SDK OpenAI-Compatible Proxy
 * 
 * This service wraps the @augmentcode/auggie-sdk to expose an OpenAI-compatible
 * API endpoint that Clawdbot can use as a model provider.
 * 
 * Features:
 * - OpenAI Chat Completions API compatibility
 * - Augment Context Engine integration
 * - Streaming support
 * - Multi-turn conversation handling
 */

import express, { Request, Response, NextFunction } from 'express';
import { config } from 'dotenv';
import { createChatCompletionHandler, createStreamingHandler } from './handlers/chat.js';
import { createModelsHandler } from './handlers/models.js';
import { initializeAugment } from './services/augment.js';
import { errorHandler, requestLogger } from './middleware/index.js';

// Load environment variables
config();

const app = express();
const PORT = parseInt(process.env.PORT || '3456', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'auggie-openai-proxy',
    timestamp: new Date().toISOString(),
  });
});

// OpenAI-compatible endpoints
app.get('/v1/models', createModelsHandler());
app.post('/v1/chat/completions', createChatCompletionHandler());

// IFTTT Webhook endpoint (for Google Assistant integration)
app.post('/ifttt/webhook', async (req: Request, res: Response) => {
  try {
    const { value1, value2, value3 } = req.body;
    const commandText = value2 || value1;
    
    if (!commandText) {
      return res.status(400).json({ error: 'Missing command text' });
    }

    console.log(`[IFTTT] Received: "${commandText}"`);
    
    // Process through Augment
    const handler = createChatCompletionHandler();
    const mockReq = {
      body: {
        model: 'claude-sonnet-4-5',
        messages: [{ role: 'user', content: commandText }],
        stream: false,
      },
    } as Request;

    // Create a promise to capture the response
    let responseData: any;
    const mockRes = {
      json: (data: any) => { responseData = data; },
      status: () => mockRes,
      setHeader: () => mockRes,
      write: () => {},
      end: () => {},
    } as unknown as Response;

    await handler(mockReq, mockRes, () => {});

    res.json({
      success: true,
      source: 'google_assistant_ifttt',
      command: commandText,
      response: responseData?.choices?.[0]?.message?.content || 'Processed',
    });
  } catch (error) {
    console.error('[IFTTT] Error:', error);
    res.status(500).json({ error: 'Failed to process IFTTT webhook' });
  }
});

// Error handler
app.use(errorHandler);

// Start server
async function main() {
  try {
    console.log('🚀 Initializing Auggie SDK...');
    await initializeAugment();
    console.log('✅ Auggie SDK initialized');

    app.listen(PORT, HOST, () => {
      console.log(`\n🎉 Auggie OpenAI Proxy running at http://${HOST}:${PORT}`);
      console.log(`\n📡 Endpoints:`);
      console.log(`   GET  /health              - Health check`);
      console.log(`   GET  /v1/models           - List available models`);
      console.log(`   POST /v1/chat/completions - Chat completions (OpenAI format)`);
      console.log(`   POST /ifttt/webhook       - IFTTT webhook (Google Assistant)`);
      console.log(`\n💡 Configure Clawdbot with:`);
      console.log(`   baseUrl: "http://${HOST}:${PORT}/v1"`);
      console.log(`   api: "openai-completions"\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

main();

