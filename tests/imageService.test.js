import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { generateImage } from '../dist/services/pollinations/imageService.js';

async function withStubbedFetch(fn) {
  const oldFetch = globalThis.fetch;
  const png = await sharp({ create: { width: 3, height: 2, channels: 4, background: '#336699ff' } })
    .png()
    .toBuffer();

  globalThis.fetch = async () => new Response(png, { headers: { 'content-type': 'image/png' } });
  try {
    return await fn(png);
  } finally {
    globalThis.fetch = oldFetch;
  }
}

describe('generateImage includeData', () => {
  test('includeData=false saves the image without returning base64 data', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-image-service-'));
    try {
      await withStubbedFetch(async (png) => {
        const result = await generateImage({
          prompt: 'save only image',
          outputPath: dir,
          fileName: 'save-only',
          includeData: false,
        });

        assert.equal(result.data, undefined);
        assert.deepEqual(await readFile(result.filePath), png);
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
