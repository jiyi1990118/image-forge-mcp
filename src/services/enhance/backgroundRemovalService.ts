import { writeFile } from 'fs/promises';
import { join, basename, dirname, extname } from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { log } from '../../utils/logger.js';

export type RemoveBackgroundStrategy = 'auto' | 'default' | 'preserve-light-subject' | 'clean-edge';

export interface RemoveBgOptions {
  inputPath: string;
  outputPath?: string;
  strategy?: RemoveBackgroundStrategy;
}

export interface RemoveBgResult {
  outputPath: string;
  modelUsed: string;
  strategy: Exclude<RemoveBackgroundStrategy, 'auto'>;
}

export interface BackgroundStrategyAnalysis {
  strategy: Exclude<RemoveBackgroundStrategy, 'auto'>;
  background: { r: number; g: number; b: number };
  lightness: number;
  saturation: number;
}

function rgbToHslStats(r: number, g: number, b: number): { lightness: number; saturation: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const lightness = (max + min) / 2;
  const delta = max - min;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return { lightness, saturation };
}

function resolveExplicitStrategy(strategy?: RemoveBackgroundStrategy): Exclude<RemoveBackgroundStrategy, 'auto'> | null {
  if (strategy === 'default' || strategy === 'preserve-light-subject' || strategy === 'clean-edge') {
    return strategy;
  }
  return null;
}

export async function analyzeBackgroundStrategy(
  inputPath: string,
  requestedStrategy: RemoveBackgroundStrategy = 'auto',
): Promise<BackgroundStrategyAnalysis> {
  const image = sharp(inputPath).ensureAlpha();
  const metadata = await image.metadata();
  const width = metadata.width || 1;
  const height = metadata.height || 1;
  const { data } = await image.raw().toBuffer({ resolveWithObject: true });

  const samples: Array<{ r: number; g: number; b: number }> = [];
  const sampleStep = Math.max(1, Math.floor(Math.min(width, height) / 20));

  for (let x = 0; x < width; x += sampleStep) {
    for (const y of [0, height - 1]) {
      const i = (y * width + x) * 4;
      samples.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
    }
  }
  for (let y = 0; y < height; y += sampleStep) {
    for (const x of [0, width - 1]) {
      const i = (y * width + x) * 4;
      samples.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
    }
  }

  const background = samples.reduce((acc, sample) => ({
    r: acc.r + sample.r / samples.length,
    g: acc.g + sample.g / samples.length,
    b: acc.b + sample.b / samples.length,
  }), { r: 0, g: 0, b: 0 });
  const roundedBackground = {
    r: Math.round(background.r),
    g: Math.round(background.g),
    b: Math.round(background.b),
  };
  const { lightness, saturation } = rgbToHslStats(roundedBackground.r, roundedBackground.g, roundedBackground.b);
  const explicit = resolveExplicitStrategy(requestedStrategy);

  let strategy: Exclude<RemoveBackgroundStrategy, 'auto'>;
  if (explicit) {
    strategy = explicit;
  } else if (lightness > 0.86 && saturation < 0.18) {
    strategy = 'preserve-light-subject';
  } else if (saturation > 0.22) {
    strategy = 'clean-edge';
  } else {
    strategy = 'default';
  }

  return { strategy, background: roundedBackground, lightness, saturation };
}

export async function removeConnectedColorBackground(
  inputPath: string,
  outputPath: string,
  background: { r: number; g: number; b: number },
): Promise<Buffer> {
  const image = sharp(inputPath).ensureAlpha();
  const metadata = await image.metadata();
  const width = metadata.width || 1;
  const height = metadata.height || 1;
  const { data } = await image.raw().toBuffer({ resolveWithObject: true });

  const hardThreshold = 42;
  const softThreshold = 92;
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  function colorDistance(pixelIndex: number): number {
    const i = pixelIndex * 4;
    return Math.hypot(data[i] - background.r, data[i + 1] - background.g, data[i + 2] - background.b);
  }

  function enqueue(pixelIndex: number): void {
    if (visited[pixelIndex] || colorDistance(pixelIndex) > softThreshold) {
      return;
    }
    visited[pixelIndex] = 1;
    queue.push(pixelIndex);
  }

  for (let x = 0; x < width; x++) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  for (let cursor = 0; cursor < queue.length; cursor++) {
    const pixelIndex = queue[cursor];
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    const i = pixelIndex * 4;
    const distance = colorDistance(pixelIndex);

    if (distance <= hardThreshold) {
      data[i + 3] = 0;
    } else {
      data[i + 3] = Math.round(data[i + 3] * ((distance - hardThreshold) / (softThreshold - hardThreshold)));
    }

    if (x > 0) {
      enqueue(pixelIndex - 1);
    }
    if (x < width - 1) {
      enqueue(pixelIndex + 1);
    }
    if (y > 0) {
      enqueue(pixelIndex - width);
    }
    if (y < height - 1) {
      enqueue(pixelIndex + width);
    }
  }

  const buffer = await sharp(data, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
  await writeFile(outputPath, buffer);
  return buffer;
}

/**
 * Resolve the correct publicPath for @imgly/background-removal-node.
 *
 * The package defaults publicPath to `file://{cwd}/node_modules/.../dist/`,
 * which breaks when the MCP server is launched from a different working directory.
 * This function uses Node's own module resolution to find the real path.
 */
function resolveImglyPublicPath(): string {
  const require = createRequire(import.meta.url);
  const mainPath = require.resolve('@imgly/background-removal-node');
  const distDir = dirname(mainPath);
  return `file://${distDir}/`;
}

function getBgRemovalTimeoutMs(): number {
  const env = process.env.BG_REMOVAL_TIMEOUT_MS;
  if (env === undefined) return 300000;
  const parsed = Number(env);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 300000;
}

/**
 * AI 去背景 — 使用 @imgly/background-removal-node
 *
 * 基于 ONNX 运行时，本地执行，无需 API key 或 Python。
 * 首次运行会下载模型文件 (~200MB)，后续使用缓存。
 *
 * 支持复杂背景、渐变、阴影 — 比 color-distance 方法可靠得多。
 */
export async function removeBackgroundImage(opts: RemoveBgOptions): Promise<RemoveBgResult> {
  const { inputPath, outputPath, strategy: requestedStrategy = 'auto' } = opts;

  const dir = dirname(inputPath);
  const base = basename(inputPath, extname(inputPath));
  const outPath = outputPath || join(dir, `${base}_nobg.png`);

  const analysis = await analyzeBackgroundStrategy(inputPath, requestedStrategy);
  log(`Removing background (${analysis.strategy}, bg rgb ${analysis.background.r},${analysis.background.g},${analysis.background.b})...`);

  if (analysis.strategy === 'clean-edge') {
    const buffer = await removeConnectedColorBackground(inputPath, outPath, analysis.background);
    log(`Background removed: ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
    return {
      outputPath: outPath,
      modelUsed: 'solid-color edge analysis',
      strategy: analysis.strategy,
    };
  }

  const { removeBackground } = await import('@imgly/background-removal-node');
  const publicPath = resolveImglyPublicPath();
  const timeoutMs = getBgRemovalTimeoutMs();
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error(`Background removal timed out after ${Math.round(timeoutMs / 1000)}s`)),
      timeoutMs
    );
  });
  const blob = await Promise.race([
    removeBackground(inputPath, { publicPath }),
    timeoutPromise,
  ]);

  const buffer = Buffer.from(await blob.arrayBuffer());
  await writeFile(outPath, buffer);

  log(`Background removed: ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`);

  return {
    outputPath: outPath,
    modelUsed: '@imgly/background-removal-node',
    strategy: analysis.strategy,
  };
}
