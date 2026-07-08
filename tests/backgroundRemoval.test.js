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
});
