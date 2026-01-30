/**
 * Models Handler
 * 
 * Implements OpenAI-compatible /v1/models endpoint
 */

import { Request, Response } from 'express';
import { getAvailableModels } from '../services/augment.js';

/**
 * Create handler for listing available models
 */
export function createModelsHandler() {
  return (_req: Request, res: Response) => {
    const models = getAvailableModels();
    
    res.json({
      object: 'list',
      data: models.map((id) => ({
        id,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'augment',
        permission: [],
        root: id,
        parent: null,
      })),
    });
  };
}

