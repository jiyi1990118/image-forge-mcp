import fs from 'fs';
import path from 'path';
import { buildImageUrl, fetchWithAuth, type AuthConfig } from './client.js';
import { generateFileName, uniqueFilePath, randomSeed } from '../../utils/fileUtils.js';
import { log } from '../../utils/logger.js';
import { DEFAULTS } from '../../config/constants.js';

export interface GenerateImageOptions {
  prompt: string;
  model?: string;
  seed?: number;
  width?: number;
  height?: number;
  enhance?: boolean;
  safe?: boolean;
  outputPath?: string;
  fileName?: string;
  format?: string;
  includeData?: boolean;
  authConfig?: AuthConfig | null;
}

export interface GenerateImageResult {
  data?: string; // base64 when requested
  mimeType: string;
  filePath: string;
  metadata: {
    prompt: string;
    model: string;
    seed: number;
    width: number;
    height: number;
    enhance: boolean;
    safe: boolean;
  };
}

export async function generateImage(opts: GenerateImageOptions): Promise<GenerateImageResult> {
  const {
    prompt,
    model = DEFAULTS.IMAGE_MODEL,
    seed = randomSeed(),
    width = 1024,
    height = 1024,
    enhance = false,
    safe = false,
    outputPath = './vision-output',
    fileName,
    format = 'png',
    includeData = true,
    authConfig = null,
  } = opts;

  const url = buildImageUrl(prompt, model, seed, width, height, enhance, safe, authConfig);
  const response = await fetchWithAuth(url, authConfig);
  const imageBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(imageBuffer);
  const base64Data = includeData ? buffer.toString('base64') : undefined;
  const contentType = response.headers.get('content-type') || 'image/png';

  const finalFileName = generateFileName(prompt, fileName, format);
  const filePath = uniqueFilePath(outputPath, finalFileName);
  fs.writeFileSync(filePath, buffer);

  return {
    data: base64Data,
    mimeType: contentType,
    filePath,
    metadata: { prompt, model, seed, width, height, enhance, safe },
  };
}

export async function generateImageUrlOnly(opts: GenerateImageOptions): Promise<{
  imageUrl: string;
  metadata: GenerateImageResult['metadata'];
}> {
  const {
    prompt,
    model = DEFAULTS.IMAGE_MODEL,
    seed = randomSeed(),
    width = 1024,
    height = 1024,
    enhance = false,
    safe = false,
    authConfig = null,
  } = opts;

  const url = buildImageUrl(prompt, model, seed, width, height, enhance, safe, authConfig);
  return {
    imageUrl: url,
    metadata: { prompt, model, seed, width, height, enhance, safe },
  };
}
