import { mkdir, stat } from 'fs/promises';
import { dirname } from 'path';
import sharp from 'sharp';

export interface SharpFallbackUpscaleOptions {
  inputPath: string;
  outputPath: string;
  scale: 2 | 3 | 4;
}

export interface SharpFallbackUpscaleResult {
  inputPath: string;
  outputPath: string;
  scale: number;
  backend: 'sharp';
  outputSize: number;
}

export async function upscaleWithSharpFallback(
  options: SharpFallbackUpscaleOptions
): Promise<SharpFallbackUpscaleResult> {
  const meta = await sharp(options.inputPath).metadata();
  if (!meta.width || !meta.height) {
    throw new Error(`Could not read image dimensions: ${options.inputPath}`);
  }

  await mkdir(dirname(options.outputPath), { recursive: true });
  await sharp(options.inputPath)
    .resize({
      width: meta.width * options.scale,
      height: meta.height * options.scale,
      fit: 'fill',
      kernel: sharp.kernel.lanczos3,
    })
    .png({ quality: 95 })
    .toFile(options.outputPath);

  const outputSize = (await stat(options.outputPath)).size;
  return {
    inputPath: options.inputPath,
    outputPath: options.outputPath,
    scale: options.scale,
    backend: 'sharp',
    outputSize,
  };
}
