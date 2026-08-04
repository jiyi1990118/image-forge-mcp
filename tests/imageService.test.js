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
  test('defaults image model to qwen-image', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-image-service-'));
    try {
      await withStubbedFetch(async () => {
        const result = await generateImage({
          prompt: 'default model image',
          outputPath: dir,
          fileName: 'default-model',
          includeData: false,
        });

        assert.equal(result.metadata.model, 'qwen-image');
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

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

describe('generateImage content-type validation', () => {
  test('throws on non-image response (HTML error page) without writing a file', async () => {
    const oldFetch = globalThis.fetch;
    const dir = await mkdtemp(join(tmpdir(), 'vision-image-service-'));
    const htmlBody = '<html><body>500 Internal Server Error</body></html>';
    globalThis.fetch = async () =>
      new Response(htmlBody, { headers: { 'content-type': 'text/html' } });

    try {
      await assert.rejects(
        generateImage({
          prompt: 'bad response test',
          outputPath: dir,
          fileName: 'should-not-exist',
          includeData: false,
        }),
        /non-image response/i
      );
      const { readdir } = await import('node:fs/promises');
      const files = await readdir(dir);
      assert.equal(files.length, 0, 'no file should be written for a non-image response');
    } finally {
      globalThis.fetch = oldFetch;
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('accepts JPEG magic bytes', async () => {
    const oldFetch = globalThis.fetch;
    const dir = await mkdtemp(join(tmpdir(), 'vision-image-service-'));
    const jpegBytes = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
    ]);
    globalThis.fetch = async () =>
      new Response(jpegBytes, { headers: { 'content-type': 'image/jpeg' } });

    try {
      const result = await generateImage({
        prompt: 'jpeg test',
        outputPath: dir,
        fileName: 'jpeg-test',
        format: 'jpg',
        includeData: false,
      });
      assert.equal(result.filePath.endsWith('.jpg'), true);
    } finally {
      globalThis.fetch = oldFetch;
      await rm(dir, { recursive: true, force: true });
    }
  });
});
