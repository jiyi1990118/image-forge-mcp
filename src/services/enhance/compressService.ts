import { mkdtemp, rm, rename, stat } from 'fs/promises';
import { join, basename, dirname } from 'path';
import { log, warn } from '../../utils/logger.js';

export interface CompressOptions {
  quality?: [number, number];
  speed?: number;
}

export interface CompressResult {
  outputPath: string;
  originalSize: number;
  compressedSize: number;
  compressed: boolean;
  warning?: string;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function compressImage(
  inputPath: string,
  options: CompressOptions = {}
): Promise<CompressResult> {
  const { quality = [0.6, 0.85], speed = 1 } = options;
  const fileName = basename(inputPath);

  if (!fileName.toLowerCase().endsWith('.png')) {
    log(`Skipping compression (not PNG): ${fileName}`);
    const size = (await stat(inputPath)).size;
    return { outputPath: inputPath, originalSize: size, compressedSize: size, compressed: false };
  }

  const dir = dirname(inputPath);
  const tempDir = await mkdtemp(join(dir, '__tmp_compress__-'));
  const tempOut = join(tempDir, fileName);

  try {
    const imagemin = (await import('imagemin')).default;
    const pngquant = (await import('imagemin-pngquant')).default;
    const zopfli = (await import('imagemin-zopfli')).default;

    await imagemin([inputPath], {
      destination: tempDir,
      plugins: [
        pngquant({ quality, speed }),
        zopfli(),
      ],
    });

    const originalSize = (await stat(inputPath)).size;
    const compressedSize = (await stat(tempOut)).size;

    if (compressedSize < originalSize) {
      await rename(tempOut, inputPath);
      log(`Compressed: ${fileName}  ${formatBytes(originalSize)} -> ${formatBytes(compressedSize)}`);
      return { outputPath: inputPath, originalSize, compressedSize, compressed: true };
    } else {
      log(`Compression skipped (result larger): ${fileName} (${formatBytes(originalSize)})`);
      return { outputPath: inputPath, originalSize, compressedSize: originalSize, compressed: false };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    warn(`Compression failed: ${fileName} - ${message}`);
    const size = (await stat(inputPath)).size;
    return { outputPath: inputPath, originalSize: size, compressedSize: size, compressed: false, warning: `Compression failed: ${message}` };
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}
