import { basename, dirname, extname, join } from 'path';
import { applyClarity, DEFAULT_CLARITY } from '../enhance/clarityService.js';
import { compressImage, formatBytes } from '../enhance/compressService.js';
import { removeBackgroundImage, type RemoveBackgroundStrategy } from '../enhance/backgroundRemovalService.js';
import { enhanceGeneratedImage, type EnhancementBackend, type EnhancementFallback } from '../upscale/generationEnhancementService.js';
import { selectRealEsrganModel } from '../upscale/modelSelectionService.js';
import { shouldUseAssetPipeline } from '../../config/assetKeywords.js';
import { noBackgroundOutputPath } from '../../utils/pathUtils.js';
import { clampNumber } from '../../utils/validate.js';
import { log, error } from '../../utils/logger.js';

export interface PostProcessingResult {
  finalPath: string;
  processedPath: string | null;
  enhancementPath: string | null;
  mimeType: string;
  processingInfo: string;
  error?: string;
}

function parseRemoveBackgroundStrategy(value: unknown): RemoveBackgroundStrategy {
  return value === 'default' || value === 'preserve-light-subject' || value === 'clean-edge'
    ? value
    : 'auto';
}

function parseScale(value: unknown): 2 | 3 | 4 {
  const numeric = Number(value || 2);
  return numeric === 3 || numeric === 4 ? numeric : 2;
}

function parseEnhanceBackend(value: unknown): EnhancementBackend {
  return value === 'realesrgan' || value === 'sharp' || value === 'none' ? value : 'auto';
}

function parseEnhanceFallback(value: unknown): EnhancementFallback {
  return value === 'none' ? 'none' : 'sharp';
}

export async function runPostProcessing(
  rawPath: string,
  prompt: string,
  initialMimeType: string,
  args: Record<string, unknown>
): Promise<PostProcessingResult> {
  const denoise = args.denoise !== undefined ? args.denoise !== false : DEFAULT_CLARITY.denoise;
  const denoiseMethod: 'median' | 'neural' = args.denoiseMethod === 'neural' ? 'neural' : 'median';
  const denoiseRadius = args.denoiseRadius ? clampNumber(args.denoiseRadius, DEFAULT_CLARITY.denoiseRadius, 1, 3) : DEFAULT_CLARITY.denoiseRadius;
  const sharpen = args.sharpen === true;
  const enhanceContrast = args.enhanceContrast === true;
  const realEsrgan = args.realEsrgan !== undefined ? args.realEsrgan !== false : true;
  const enhanceBackend = parseEnhanceBackend(args.enhanceBackend);
  const enhanceFallback = parseEnhanceFallback(args.enhanceFallback);
  const requestedRealEsrganModel = args.realEsrganModel ? String(args.realEsrganModel) : 'auto';
  const realEsrganModel = selectRealEsrganModel(prompt, requestedRealEsrganModel);
  const realEsrganScale = parseScale(args.realEsrganScale);
  const realEsrganAutoDownload = args.realEsrganAutoDownload !== undefined ? args.realEsrganAutoDownload !== false : true;
  const realEsrganTimeoutMs = args.realEsrganTimeoutMs ? clampNumber(args.realEsrganTimeoutMs, 120000, 10000, 600000) : 120000;

  let removeBackground: boolean;
  if (args.removeBackground !== undefined) {
    removeBackground = args.removeBackground === true;
  } else {
    removeBackground = shouldUseAssetPipeline(prompt);
  }
  const removeBackgroundStrategy = parseRemoveBackgroundStrategy(args.removeBackgroundStrategy);

  const clarityActive = denoise || sharpen || enhanceContrast;
  const dir = dirname(rawPath);
  const base = basename(rawPath, extname(rawPath));

  let finalPath = rawPath;
  let processedPath: string | null = null;
  let enhancementPath: string | null = null;
  let processingInfo = '';
  let mimeType = initialMimeType;

  try {
    if (clarityActive) {
      processedPath = join(dir, `${base}_processed.png`);
      finalPath = processedPath;
      mimeType = 'image/png';

      log('Applying clarity pipeline...');
      const clarityRes = await applyClarity(rawPath, processedPath, {
        denoise,
        denoiseMethod,
        denoiseRadius,
        sharpen,
        enhanceContrast,
      });
      processingInfo += `\nClarity: ${clarityRes.steps.join(' + ') || 'none'}${clarityRes.denoiseFallback ? ' (neural fallback to median)' : ''}`;
    }

    if (realEsrgan && enhanceBackend !== 'none') {
      enhancementPath = join(dir, `${base}_enhanced.png`);
      const enhancement = await enhanceGeneratedImage({
        inputPath: finalPath,
        outputPath: enhancementPath,
        enabled: true,
        backend: enhanceBackend,
        fallback: enhanceFallback,
        model: realEsrganModel,
        scale: realEsrganScale,
        autoDownload: realEsrganAutoDownload,
        timeoutMs: realEsrganTimeoutMs,
      });
      finalPath = enhancement.outputPath;
      mimeType = 'image/png';
      processingInfo += `\nEnhancement: Real-ESRGAN model: ${realEsrganModel}. ${enhancement.message}`;
      if (enhancement.binaryPath) {
        processingInfo += `\nReal-ESRGAN binary: ${enhancement.binaryPath}`;
      }
    }

    if (removeBackground) {
      const bgOutputPath = noBackgroundOutputPath(finalPath);
      log('Removing background...');
      const bgRes = await removeBackgroundImage({ inputPath: finalPath, outputPath: bgOutputPath, strategy: removeBackgroundStrategy });
      finalPath = bgRes.outputPath;
      mimeType = 'image/png';
      processingInfo += `\nBackground removed: ${bgRes.modelUsed} (${bgRes.strategy})`;
    }

    if (args.compress !== false && finalPath.endsWith('.png')) {
      const compressResult = await compressImage(finalPath);
      if (compressResult.warning) {
        processingInfo += `\nCompression warning: ${compressResult.warning}`;
      } else if (compressResult.compressed) {
        processingInfo += `\nCompression: ${formatBytes(compressResult.originalSize)} -> ${formatBytes(compressResult.compressedSize)}`;
      } else {
        processingInfo += `\nCompression: skipped (${formatBytes(compressResult.originalSize)})`;
      }
    }
  } catch (postError) {
    const errorMsg = postError instanceof Error ? postError.message : String(postError);
    error('Post-processing failed:', errorMsg);
    return { finalPath, processedPath, enhancementPath, mimeType, processingInfo, error: errorMsg };
  }

  return { finalPath, processedPath, enhancementPath, mimeType, processingInfo };
}