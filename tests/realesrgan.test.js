import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  getRealEsrganPackageInfo,
  checkRealEsrganAvailability,
  ensureRealEsrgan,
} from '../dist/services/upscale/realesrganService.js';

describe('getRealEsrganPackageInfo', () => {
  test('selects Windows package', () => {
    const info = getRealEsrganPackageInfo('win32');
    assert.equal(info.platform, 'windows');
    assert.equal(info.binaryName, 'realesrgan-ncnn-vulkan.exe');
    assert.match(info.url, /windows\.zip$/);
  });

  test('selects macOS package', () => {
    const info = getRealEsrganPackageInfo('darwin');
    assert.equal(info.platform, 'macos');
    assert.equal(info.binaryName, 'realesrgan-ncnn-vulkan');
    assert.match(info.url, /macos\.zip$/);
  });

  test('selects Linux package', () => {
    const info = getRealEsrganPackageInfo('linux');
    assert.equal(info.platform, 'ubuntu');
    assert.equal(info.binaryName, 'realesrgan-ncnn-vulkan');
    assert.match(info.url, /ubuntu\.zip$/);
  });

  test('rejects unsupported platforms', () => {
    assert.throws(() => getRealEsrganPackageInfo('freebsd'), /Unsupported platform/);
  });
});

describe('checkRealEsrganAvailability', () => {
  test('reports unavailable without downloading when binary is missing', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-realesrgan-availability-'));
    const oldPath = process.env.REALESRGAN_PATH;
    const oldCache = process.env.REALESRGAN_CACHE_DIR;
    delete process.env.REALESRGAN_PATH;
    process.env.REALESRGAN_CACHE_DIR = dir;

    try {
      const result = await checkRealEsrganAvailability({ autoDownload: false });
      assert.equal(result.supportedPlatform, true);
      assert.equal(result.binaryAvailable, false);
      assert.equal(result.downloaded, false);
      assert.equal(result.available, false);
      assert.match(result.reason || '', /not found|autoDownload/i);
    } finally {
      if (oldPath === undefined) delete process.env.REALESRGAN_PATH;
      else process.env.REALESRGAN_PATH = oldPath;
      if (oldCache === undefined) delete process.env.REALESRGAN_CACHE_DIR;
      else process.env.REALESRGAN_CACHE_DIR = oldCache;
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('ensureRealEsrgan', () => {
  test('shares one auto-download attempt for concurrent calls to the same cache', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-realesrgan-lock-'));
    const oldPath = process.env.REALESRGAN_PATH;
    const oldCache = process.env.REALESRGAN_CACHE_DIR;
    const oldFetch = globalThis.fetch;
    let fetchCount = 0;

    delete process.env.REALESRGAN_PATH;
    process.env.REALESRGAN_CACHE_DIR = dir;
    globalThis.fetch = async () => {
      fetchCount += 1;
      return new Response('fail', { status: 500, statusText: 'test' });
    };

    try {
      const results = await Promise.allSettled([
        ensureRealEsrgan(true),
        ensureRealEsrgan(true),
      ]);

      assert.equal(fetchCount, 1);
      assert.equal(results[0].status, 'rejected');
      assert.equal(results[1].status, 'rejected');
    } finally {
      globalThis.fetch = oldFetch;
      if (oldPath === undefined) delete process.env.REALESRGAN_PATH;
      else process.env.REALESRGAN_PATH = oldPath;
      if (oldCache === undefined) delete process.env.REALESRGAN_CACHE_DIR;
      else process.env.REALESRGAN_CACHE_DIR = oldCache;
      await rm(dir, { recursive: true, force: true });
    }
  });
});