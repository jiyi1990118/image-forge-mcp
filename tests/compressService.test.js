import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { compressImage } from '../dist/services/enhance/compressService.js';

describe('compressImage', () => {
  test('does not delete an existing __tmp_compress__ sibling directory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-compress-'));
    try {
      const legacyTempDir = join(dir, '__tmp_compress__');
      const sentinelPath = join(legacyTempDir, 'sentinel.txt');
      const inputPath = join(dir, 'input.png');

      await mkdir(legacyTempDir);
      await writeFile(sentinelPath, 'keep me');
      await sharp({ create: { width: 8, height: 8, channels: 4, background: '#336699ff' } })
        .png()
        .toFile(inputPath);

      const result = await compressImage(inputPath);

      assert.equal(result.outputPath, inputPath);
      assert.ok(result.originalSize > 0);
      assert.ok(result.compressedSize > 0);
      await stat(sentinelPath);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('skips non-PNG files without warning', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-compress-'));
    try {
      const inputPath = join(dir, 'input.jpg');
      await writeFile(inputPath, Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
      const result = await compressImage(inputPath);
      assert.equal(result.compressed, false);
      assert.equal(result.warning, undefined);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
