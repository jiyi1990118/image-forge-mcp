import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { upscaleWithSharpFallback } from '../dist/services/upscale/fallbackUpscaleService.js';

describe('upscaleWithSharpFallback', () => {
  test('creates a scaled PNG output with lanczos fallback', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-fallback-'));
    try {
      const inputPath = join(dir, 'input.png');
      const outputPath = join(dir, 'output.png');
      await sharp({ create: { width: 8, height: 6, channels: 4, background: '#ff0000ff' } })
        .png()
        .toFile(inputPath);

      const result = await upscaleWithSharpFallback({ inputPath, outputPath, scale: 2 });
      const meta = await sharp(result.outputPath).metadata();

      assert.equal(result.backend, 'sharp');
      assert.equal(result.scale, 2);
      assert.equal(meta.width, 16);
      assert.equal(meta.height, 12);
      assert.equal(meta.format, 'png');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
