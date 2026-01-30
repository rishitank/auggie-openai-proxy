/**
 * IFTTT Webhook Handler
 *
 * Single Responsibility: Handles IFTTT webhooks for Google Assistant integration
 * KISS: Simple, direct implementation without mock request hacks
 */

import type { Request, Response, NextFunction } from 'express';
import { getAugmentService } from '../services/augment.js';
import { MessageRole, IFTTTWebhookRequestSchema } from '../types/index.js';

/** Default model for IFTTT requests */
const DEFAULT_MODEL = 'claude-sonnet-4-5';

/**
 * Handle IFTTT webhook requests from Google Assistant
 */
export const handleIFTTTWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate request body
    const parseResult = IFTTTWebhookRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid IFTTT webhook payload' });
      return;
    }

    const { value1, value2 } = parseResult.data;
    const commandText = value2 ?? value1 ?? '';

    if (commandText === '') {
      res.status(400).json({ error: 'Missing command text (value1 or value2)' });
      return;
    }

    console.log(`[IFTTT] Received: "${commandText}"`);

    // Process through Augment service directly (KISS - no mock request)
    const service = getAugmentService();
    const result = await service.generateCompletion(
      [{ role: MessageRole.User, content: commandText }],
      DEFAULT_MODEL
    );

    res.json({
      success: true,
      source: 'google_assistant_ifttt',
      command: commandText,
      response: result.text,
    });
  } catch (error) {
    console.error('[IFTTT] Error:', error);
    next(error);
  }
};

