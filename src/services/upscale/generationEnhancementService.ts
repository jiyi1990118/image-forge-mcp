import { enhanceWithRealEsrgan, type RealEsrganModel } from './realesrganService.js';
import { upscaleWithSharpFallback } from './fallbackUpscaleService.js';

export type EnhancementBackend = 'auto' | 'realesrgan' | 'sharp' | 'none';
export type EnhancementFallback = 'sharp' | 'none';

export interface EnhanceGeneratedImageOptions {
  inputPath: string;
  outputPath: string;
  enabled: boolean;
  backend: EnhancementBackend;
  fallback: EnhancementFallback;
  model: RealEsrganModel;
  scale: 2 | 3 | 4;
  autoDownload: boolean;
  timeoutMs: number;
}

export interface EnhanceGeneratedImageResult {
  inputPath: string;
  outputPath: string;
  backendUsed: 'realesrgan' | 'sharp' | 'none';
  fallbackUsed: boolean;
  scale: number;
  message: string;
  binaryPath?: string;
}

export async function enhanceGeneratedImage(
  options: EnhanceGeneratedImageOptions
): Promise<EnhanceGeneratedImageResult> {
  if (!options.enabled || options.backend === 'none') {
    return {
      inputPath: options.inputPath,
      outputPath: options.inputPath,
      backendUsed: 'none',
      fallbackUsed: false,
      scale: 1,
      message: 'Enhancement disabled.',
    };
  }

  if (options.backend === 'sharp') {
    const result = await upscaleWithSharpFallback({
      inputPath: options.inputPath,
      outputPath: options.outputPath,
      scale: options.scale,
    });
    return {
      inputPath: result.inputPath,
      outputPath: result.outputPath,
      backendUsed: 'sharp',
      fallbackUsed: false,
      scale: result.scale,
      message: 'Enhanced with sharp CPU fallback backend.',
    };
  }

  try {
    const result = await enhanceWithRealEsrgan({
      inputPath: options.inputPath,
      outputPath: options.outputPath,
      model: options.model,
      scale: options.scale,
      autoDownload: options.autoDownload,
      timeoutMs: options.timeoutMs,
    });
    return {
      inputPath: result.inputPath,
      outputPath: result.outputPath,
      backendUsed: 'realesrgan',
      fallbackUsed: false,
      scale: result.scale,
      message: `Enhanced with Real-ESRGAN (${result.model}).`,
      binaryPath: result.binaryPath,
    };
  } catch (error) {
    if (options.backend === 'realesrgan' || options.fallback !== 'sharp') {
      throw error;
    }

    const result = await upscaleWithSharpFallback({
      inputPath: options.inputPath,
      outputPath: options.outputPath,
      scale: options.scale,
    });
    const reason = error instanceof Error ? error.message : String(error);
    return {
      inputPath: result.inputPath,
      outputPath: result.outputPath,
      backendUsed: 'sharp',
      fallbackUsed: true,
      scale: result.scale,
      message: `Real-ESRGAN unavailable; used sharp CPU fallback. Reason: ${reason}`,
    };
  }
}
