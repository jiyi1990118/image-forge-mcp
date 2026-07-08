import type { RealEsrganModel } from './realesrganService.js';

const ALLOWED_MODELS = ['auto', 'realesrgan-x4plus', 'realesrgan-x4plus-anime', 'realesr-animevideov3'] as const;

export type GenerateRealEsrganModel = RealEsrganModel | 'auto';

function parseRequestedModel(requestedModel: unknown): GenerateRealEsrganModel {
  return ALLOWED_MODELS.includes(requestedModel as GenerateRealEsrganModel)
    ? requestedModel as GenerateRealEsrganModel
    : 'auto';
}

export function selectRealEsrganModel(prompt: string, requestedModel: unknown): RealEsrganModel {
  const model = parseRequestedModel(requestedModel);
  if (model !== 'auto') {
    return model;
  }

  return 'realesr-animevideov3';
}
