export { generateImageSchema, generateImageUrlSchema } from './imageSchemas.js';
export { listImageModelsSchema, listTextModelsSchema } from './textSchemas.js';

import { generateImageSchema, generateImageUrlSchema } from './imageSchemas.js';
import { listImageModelsSchema, listTextModelsSchema } from './textSchemas.js';
import type { ToolSchema } from '../types/schemas.js';

export function getAllToolSchemas(): ToolSchema[] {
  return [
    generateImageSchema,
    generateImageUrlSchema,
    listImageModelsSchema,
    listTextModelsSchema,
  ];
}