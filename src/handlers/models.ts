/**
 * Models Handler
 *
 * Single Responsibility: Handles /v1/models endpoint
 * Returns available models in OpenAI-compatible format
 */

import type { Request, Response } from 'express';
import { getAugmentService } from '#services/augment';
import type { ModelsListResponse, ModelInfo } from '#types';

/** Get current Unix timestamp */
const getCurrentTimestamp = (): number => Math.floor(Date.now() / 1000);

/**
 * Build model info object
 */
function buildModelInfo(id: string): ModelInfo {
  return {
    id,
    object: 'model',
    created: getCurrentTimestamp(),
    owned_by: 'augment',
  };
}

/**
 * Handle models list request
 */
export function handleModelsList(_req: Request, res: Response): void {
  const service = getAugmentService();
  const models = service.getAvailableModels();

  const response: ModelsListResponse = {
    object: 'list',
    data: models.map(buildModelInfo),
  };

  res.json(response);
}

