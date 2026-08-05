import { readFileSync } from 'fs';
import { generateImage, generateImageUrlOnly } from '../services/pollinations/imageService.js';
import { buildGenerationPrompt } from '../services/pipeline/promptBuilder.js';
import { runPostProcessing, type PostProcessingResult } from '../services/pipeline/postProcessor.js';
import { selectImageModel } from '../config/assetKeywords.js';
import { DEFAULTS } from '../config/constants.js';
import { randomSeed } from '../utils/fileUtils.js';
import { clampNumber, sanitizeFileName } from '../utils/validate.js';
import type { AuthConfig } from '../services/pollinations/client.js';

type ImageContent = { type: string; data?: string; mimeType?: string; text: string };

function parseReturnMode(value: unknown): 'path' | 'binary' | 'both' {
  return value === 'binary' || value === 'both' ? value : 'path';
}

function generationParams(args: Record<string, unknown>, prompt: string, generationPrompt: string, returnMode: 'path' | 'binary' | 'both', authConfig: AuthConfig | null) {
  return {
    prompt: generationPrompt,
    model: selectImageModel(prompt, args.model),
    seed: args.seed ? Number(args.seed) : randomSeed(),
    width: args.width ? clampNumber(args.width, DEFAULTS.IMAGE_WIDTH, 64, 2048) : DEFAULTS.IMAGE_WIDTH,
    height: args.height ? clampNumber(args.height, DEFAULTS.IMAGE_HEIGHT, 64, 2048) : DEFAULTS.IMAGE_HEIGHT,
    enhance: args.enhance !== undefined ? args.enhance === true : DEFAULTS.IMAGE_ENHANCE,
    safe: args.safe !== undefined ? args.safe === true : DEFAULTS.IMAGE_SAFE,
    outputPath: args.outputPath ? String(args.outputPath) : DEFAULTS.OUTPUT_DIR,
    fileName: args.fileName ? sanitizeFileName(String(args.fileName)) || undefined : undefined,
    format: args.format ? String(args.format) : 'png',
    includeData: returnMode !== 'path',
    authConfig,
  };
}

function buildPartialFailureResponse(
  rawPath: string,
  initialMimeType: string,
  optimizedFrom: string | null,
  returnMode: 'path' | 'binary' | 'both',
  processingInfo: string,
  errorMsg: string
): { content: ImageContent[]; isError: boolean } {
  const content: ImageContent[] = [];
  if (returnMode === 'binary' || returnMode === 'both') {
    content.push({ type: 'image', data: readFileSync(rawPath).toString('base64'), mimeType: initialMimeType, text: '' });
  }

  let text = `Post-processing failed. Raw image saved to: ${rawPath}`;
  if (optimizedFrom) {
    text += `\n\nOptimized from original: "${optimizedFrom}"`;
  }
  text += `\n\nCompleted steps:${processingInfo || ' (none)'}`;
  text += `\n\nFailed: ${errorMsg}`;
  content.push({ type: 'text', text });

  return { content, isError: true };
}

function buildSuccessResponse(
  generationPrompt: string,
  optimizedFrom: string | null,
  result: { metadata: unknown; mimeType: string },
  rawPath: string,
  postResult: PostProcessingResult,
  returnMode: 'path' | 'binary' | 'both'
): { content: ImageContent[] } {
  const content: ImageContent[] = [];
  if (returnMode === 'binary' || returnMode === 'both') {
    content.push({ type: 'image', data: readFileSync(postResult.finalPath).toString('base64'), mimeType: postResult.mimeType, text: '' });
  }

  let text = `Generated image from prompt: "${generationPrompt}"`;
  if (optimizedFrom) {
    text += `\n\nOptimized from original: "${optimizedFrom}"`;
  }
  text += `\n\nImage metadata: ${JSON.stringify(result.metadata, null, 2)}`;
  text += `\n\nRaw image saved to: ${rawPath}`;
  if (postResult.processedPath) {
    text += `\nProcessed image saved to: ${postResult.processedPath}`;
  }
  if (postResult.enhancementPath) {
    text += `\nEnhanced image saved to: ${postResult.enhancementPath}`;
  }
  text += `\nFinal image saved to: ${postResult.finalPath}`;
  text += postResult.processingInfo;

  if (returnMode === 'path' || returnMode === 'both') {
    content.push({ type: 'text', text });
  } else {
    content.push({ type: 'text', text: `Final image saved to: ${postResult.finalPath}${postResult.processingInfo}` });
  }

  return { content };
}

export async function handleGenerateImage(
  args: Record<string, unknown>,
  authConfig: AuthConfig | null
): Promise<{ content: ImageContent[]; isError?: boolean }> {
  const prompt = String(args.prompt || '').trim();
  if (!prompt) {
    return {
      content: [{ type: 'text', text: 'Error: prompt is required and must be a non-empty string.' }],
      isError: true,
    };
  }

  const returnMode = parseReturnMode(args.returnMode);
  const built = await buildGenerationPrompt(prompt, args, authConfig);

  const result = await generateImage(generationParams(args, prompt, built.generationPrompt, returnMode, authConfig));
  const rawPath = result.filePath;

  const postResult = await runPostProcessing(rawPath, prompt, result.mimeType, args);

  if (postResult.error) {
    return buildPartialFailureResponse(rawPath, result.mimeType, built.optimizedFrom, returnMode, postResult.processingInfo, postResult.error);
  }

  return buildSuccessResponse(built.generationPrompt, built.optimizedFrom, result, rawPath, postResult, returnMode);
}

export async function handleGenerateImageUrl(
  args: Record<string, unknown>,
  authConfig: AuthConfig | null
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  const prompt = String(args.prompt || '').trim();
  if (!prompt) {
    return { content: [{ type: 'text', text: 'Error: prompt is required and must be a non-empty string.' }], isError: true };
  }

  const built = await buildGenerationPrompt(prompt, args, authConfig);

  const result = await generateImageUrlOnly({
    prompt: built.generationPrompt,
    model: selectImageModel(prompt, args.model),
    seed: args.seed ? Number(args.seed) : randomSeed(),
    width: args.width ? clampNumber(args.width, DEFAULTS.IMAGE_WIDTH, 64, 2048) : DEFAULTS.IMAGE_WIDTH,
    height: args.height ? clampNumber(args.height, DEFAULTS.IMAGE_HEIGHT, 64, 2048) : DEFAULTS.IMAGE_HEIGHT,
    enhance: args.enhance !== undefined ? args.enhance === true : DEFAULTS.IMAGE_ENHANCE,
    safe: args.safe !== undefined ? args.safe === true : DEFAULTS.IMAGE_SAFE,
    authConfig,
  });

  let text = `Image URL: ${result.imageUrl}`;
  if (built.optimizedFrom) {
    text += `\n\nPrompt was optimized from: "${built.optimizedFrom}"`;
  }
  text += `\n\nMetadata: ${JSON.stringify(result.metadata, null, 2)}`;

  return { content: [{ type: 'text', text }] };
}