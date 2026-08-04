import { enhanceWithRealEsrgan, type RealEsrganModel, checkRealEsrganAvailability } from './realesrganService.js';
import { upscaleWithSharpFallback } from './fallbackUpscaleService.js';
import { log, warn } from '../../utils/logger.js';

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

interface AvailabilityCache {
  value: boolean;
  checkedAt: number;
}

let availabilityCache: AvailabilityCache | null = null;

function getRecheckMs(): number {
  const env = process.env.REALESRGAN_RECHECK_MS;
  if (env === undefined) return 300000;
  const parsed = Number(env);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 300000;
}

function invalidateAvailability(): void {
  availabilityCache = { value: false, checkedAt: Date.now() };
}

async function isRealEsrganActuallyAvailable(autoDownload: boolean): Promise<boolean> {
  const now = Date.now();
  if (availabilityCache !== null) {
    if (availabilityCache.value) return true;
    if (now - availabilityCache.checkedAt < getRecheckMs()) return false;
  }
  log('Checking Real-ESRGAN availability...');
  const status = await checkRealEsrganAvailability({ autoDownload });
  availabilityCache = { value: status.available, checkedAt: now };
  if (!status.available) {
    warn(`Real-ESRGAN not available (will use sharp fallback): ${status.reason || 'unknown'}`);
  }
  return status.available;
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

  if (options.backend === 'auto') {
    const available = await isRealEsrganActuallyAvailable(options.autoDownload);
    if (!available) {
      warn('Real-ESRGAN unavailable (cached), skipping to sharp fallback...');
      const result = await upscaleWithSharpFallback({
        inputPath: options.inputPath,
        outputPath: options.outputPath,
        scale: options.scale,
      });
      return {
        inputPath: result.inputPath,
        outputPath: result.outputPath,
        backendUsed: 'sharp',
        fallbackUsed: true,
        scale: result.scale,
        message: 'Real-ESRGAN unavailable (cached); used sharp CPU fallback.',
      };
    }
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
    invalidateAvailability();
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
