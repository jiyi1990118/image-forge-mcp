import sharp from 'sharp';
import { denoiseImageNeural, NeuralDenoiseUnavailable } from './denoiseService.js';
import { log } from '../../utils/logger.js';

export interface ClarityOptions {
  denoise: boolean;
  denoiseMethod: 'median' | 'neural';
  denoiseRadius: number;
  sharpen: boolean;
  enhanceContrast: boolean;
}

export interface ClarityResult {
  outputPath: string;
  steps: string[];
  /** true 表示神经降噪不可用，已回退到 median */
  denoiseFallback: boolean;
}

export const DEFAULT_CLARITY: ClarityOptions = {
  denoise: false,
  denoiseMethod: 'median',
  denoiseRadius: 1,
  sharpen: false,
  enhanceContrast: false,
};

/**
 * 清晰度增强流水线：降噪 (median 或 neural) → CLAHE 对比度 → unsharp 锐化。
 * 输入任意常见格式，输出 PNG（不透明）。
 *
 * 神经降噪不可用时自动回退 median（denoiseFallback=true）。
 */
export async function applyClarity(
  inputPath: string,
  outputPath: string,
  opts: ClarityOptions
): Promise<ClarityResult> {
  const steps: string[] = [];
  let denoiseFallback = false;

  let workingPath = inputPath;
  let cleanup: string | null = null;
  let medianRadius = 0;

  if (opts.denoise) {
    if (opts.denoiseMethod === 'neural') {
      try {
        const neuralOut = outputPath.replace(/\.png$/, '_denoised.png');
        await denoiseImageNeural(inputPath, neuralOut);
        workingPath = neuralOut;
        cleanup = neuralOut;
        steps.push('denoise:neural');
      } catch (err) {
        if (err instanceof NeuralDenoiseUnavailable) {
          log(`Neural denoise unavailable, falling back to median: ${err.message}`);
          denoiseFallback = true;
          medianRadius = Math.max(1, Math.min(3, Math.floor(opts.denoiseRadius || 1)));
          steps.push(`denoise:median(r=${medianRadius}) [fallback]`);
        } else {
          throw err;
        }
      }
    } else {
      medianRadius = Math.max(1, Math.min(3, Math.floor(opts.denoiseRadius || 1)));
      steps.push(`denoise:median(r=${medianRadius})`);
    }
  }

  let img = sharp(workingPath);
  if (medianRadius > 0) {
    img = img.median(medianRadius);
  }

  if (opts.enhanceContrast) {
    img = img.clahe({ width: 8, height: 8, maxSlope: 3 });
    steps.push('clahe');
  }

  if (opts.sharpen) {
    img = img.sharpen(1.0, 1, 2);
    steps.push('sharpen');
  }

  await img.png({ quality: 95 }).toFile(outputPath);

  if (cleanup) {
    const fs = await import('fs/promises');
    await fs.unlink(cleanup).catch(() => {});
  }

  log(`Clarity applied: ${steps.join(' -> ') || 'none'}`);
  return { outputPath, steps, denoiseFallback };
}
