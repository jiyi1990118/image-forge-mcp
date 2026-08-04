import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import {
  analyzeBackgroundStrategy,
  removeConnectedColorBackground,
} from '../dist/services/enhance/backgroundRemovalService.js';

async function createSolidImage(path, background) {
  await sharp({ create: { width: 20, height: 20, channels: 4, background } })
    .png()
    .toFile(path);
}

describe('analyzeBackgroundStrategy', () => {
  test('selects preserve-light-subject for light backgrounds', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-bg-analysis-'));
    try {
      const path = join(dir, 'white.png');
      await createSolidImage(path, '#f8f8f8ff');

      const result = await analyzeBackgroundStrategy(path, 'auto');

      assert.equal(result.strategy, 'preserve-light-subject');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('selects clean-edge for saturated color backgrounds', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-bg-analysis-'));
    try {
      const path = join(dir, 'cyan.png');
      await createSolidImage(path, '#75d7eaff');

      const result = await analyzeBackgroundStrategy(path, 'auto');

      assert.equal(result.strategy, 'clean-edge');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('respects explicit strategy override', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-bg-analysis-'));
    try {
      const path = join(dir, 'cyan.png');
      await createSolidImage(path, '#75d7eaff');

      const result = await analyzeBackgroundStrategy(path, 'preserve-light-subject');

      assert.equal(result.strategy, 'preserve-light-subject');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('removeConnectedColorBackground', () => {
  test('removes edge-connected background without deleting enclosed matching subject pixels', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-bg-connected-'));
    try {
      const inputPath = join(dir, 'input.png');
      const outputPath = join(dir, 'output.png');
      const width = 12;
      const height = 12;
      const data = Buffer.alloc(width * height * 4);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          data[i] = 117;
          data[i + 1] = 215;
          data[i + 2] = 234;
          data[i + 3] = 255;
        }
      }
      for (let y = 3; y <= 8; y++) {
        for (let x = 3; x <= 8; x++) {
          if (x === 3 || x === 8 || y === 3 || y === 8) {
            const i = (y * width + x) * 4;
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
          }
        }
      }

      await sharp(data, { raw: { width, height, channels: 4 } }).png().toFile(inputPath);
      await removeConnectedColorBackground(inputPath, outputPath, { r: 117, g: 215, b: 234 });

      const { data: output } = await sharp(outputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const edgeAlpha = output[(0 * width + 0) * 4 + 3];
      const enclosedAlpha = output[(5 * width + 5) * 4 + 3];

      assert.equal(edgeAlpha, 0);
      assert.equal(enclosedAlpha, 255);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('produces partial alpha for soft-edge colors (distance between hard and soft threshold)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-bg-soft-'));
    try {
      const inputPath = join(dir, 'input.png');
      const outputPath = join(dir, 'output.png');
      const width = 4;
      const height = 4;
      const data = Buffer.alloc(width * height * 4);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          data[i] = 117;
          data[i + 1] = 215;
          data[i + 2] = 234;
          data[i + 3] = 255;
        }
      }
      // Pixel (1,0): red +50, green +40 -> distance ~64 from bg (between hard 42 and soft 92)
      data[(0 * width + 1) * 4 + 0] = 167;
      data[(0 * width + 1) * 4 + 1] = 255;

      await sharp(data, { raw: { width, height, channels: 4 } }).png().toFile(inputPath);
      await removeConnectedColorBackground(inputPath, outputPath, { r: 117, g: 215, b: 234 });

      const { data: output } = await sharp(outputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const hardAlpha = output[(0 * width + 0) * 4 + 3];
      const softAlpha = output[(0 * width + 1) * 4 + 3];

      const distance = Math.hypot(167 - 117, 255 - 215, 234 - 234);
      const expectedAlpha = Math.round(255 * ((distance - 42) / (92 - 42)));

      assert.equal(hardAlpha, 0);
      assert.ok(distance > 42 && distance < 92, `distance ${distance} should be in soft range`);
      assert.equal(softAlpha, expectedAlpha);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
