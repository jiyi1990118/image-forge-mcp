export { generateImageSchema, generateImageUrlSchema } from './imageSchemas.js';
export { enhanceImageSchema } from './upscaleSchemas.js';
export { optimizePromptSchema, respondTextSchema, listImageModelsSchema, listTextModelsSchema } from './textSchemas.js';

import { generateImageSchema, generateImageUrlSchema } from './imageSchemas.js';
import { enhanceImageSchema } from './upscaleSchemas.js';
import { optimizePromptSchema, respondTextSchema, listImageModelsSchema, listTextModelsSchema } from './textSchemas.js';
import type { ToolSchema } from '../types/schemas.js';

export function getAllToolSchemas(): ToolSchema[] {
  return [
    generateImageSchema,
    generateImageUrlSchema,
    enhanceImageSchema,
    optimizePromptSchema,
    listImageModelsSchema,
    listTextModelsSchema,
    respondTextSchema,
  ];
}
