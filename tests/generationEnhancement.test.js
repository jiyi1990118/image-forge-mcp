import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { enhanceGeneratedImage } from '../dist/services/upscale/generationEnhancementService.js';

describe('enhanceGeneratedImage', () => {
  test('falls back to sharp when Real-ESRGAN is unavailable and fallback is sharp', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-generation-enhance-'));
    const oldPath = process.env.REALESRGAN_PATH;
    const oldCache = process.env.REALESRGAN_CACHE_DIR;
    delete process.env.REALESRGAN_PATH;
    process.env.REALESRGAN_CACHE_DIR = join(dir, 'missing-cache');

    try {
      const inputPath = join(dir, 'input.png');
      const outputPath = join(dir, 'enhanced.png');
      await sharp({ create: { width: 5, height: 4, channels: 4, background: '#00ff00ff' } })
        .png()
        .toFile(inputPath);

      const result = await enhanceGeneratedImage({
        inputPath,
        outputPath,
        enabled: true,
        backend: 'auto',
        fallback: 'sharp',
        model: 'realesrgan-x4plus-anime',
        scale: 2,
        autoDownload: false,
        timeoutMs: 120000,
      });

      const meta = await sharp(result.outputPath).metadata();
      assert.equal(result.backendUsed, 'sharp');
      assert.equal(result.fallbackUsed, true);
      assert.equal(meta.width, 10);
      assert.equal(meta.height, 8);
      assert.match(result.message, /fallback/i);
    } finally {
      if (oldPath === undefined) delete process.env.REALESRGAN_PATH;
      else process.env.REALESRGAN_PATH = oldPath;
      if (oldCache === undefined) delete process.env.REALESRGAN_CACHE_DIR;
      else process.env.REALESRGAN_CACHE_DIR = oldCache;
      await rm(dir, { recursive: true, force: true });
    }
  });
});
