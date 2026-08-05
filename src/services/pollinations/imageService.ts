import fs from 'fs';
import { buildImageUrl, fetchWithAuth, type AuthConfig } from './client.js';
import { generateFileName, uniqueFilePath, randomSeed } from '../../utils/fileUtils.js';
import { DEFAULTS } from '../../config/constants.js';

const IMAGE_SIGNATURES: Array<{ name: string; offset: number; bytes: number[] }> = [
  { name: 'png', offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47] },
  { name: 'jpeg', offset: 0, bytes: [0xff, 0xd8, 0xff] },
  { name: 'gif', offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] },
  { name: 'webp', offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
];

function detectImageFormat(buffer: Buffer): string | null {
  for (const sig of IMAGE_SIGNATURES) {
    if (buffer.length < sig.offset + sig.bytes.length) continue;
    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buffer[sig.offset + i] !== sig.bytes[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      if (sig.name === 'webp' && buffer.length >= 12) {
        const riff = buffer.slice(8, 12).toString('ascii');
        if (riff === 'WEBP') return 'webp';
        continue;
      }
      return sig.name;
    }
  }
  return null;
}

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

  const url = buildImageUrl(prompt, model, seed, width, height, enhance, safe);
  const response = await fetchWithAuth(url, authConfig);
  const imageBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(imageBuffer);

  const detectedFormat = detectImageFormat(buffer);
  if (!detectedFormat) {
    const bodyPreview = buffer.toString('utf8', 0, Math.min(buffer.length, 200));
    throw new Error(
      `Pollinations returned a non-image response (content-type: ${response.headers.get('content-type') || 'unknown'}). ` +
      `First 200 chars: ${bodyPreview}`
    );
  }

  const base64Data = includeData ? buffer.toString('base64') : undefined;
  const contentType = response.headers.get('content-type') || `image/${detectedFormat}`;

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
  } = opts;

  const url = buildImageUrl(prompt, model, seed, width, height, enhance, safe);
  return {
    imageUrl: url,
    metadata: { prompt, model, seed, width, height, enhance, safe },
  };
}
