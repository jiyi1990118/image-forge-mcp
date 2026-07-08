import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { mkdtemp, rm, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { applyClarity, DEFAULT_CLARITY } from '../dist/services/enhance/clarityService.js';
import { denoiseImageNeural, NeuralDenoiseUnavailable } from '../dist/services/enhance/denoiseService.js';

let dir;
const inputPath = () => join(dir, 'in.png');

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'vision-clarity-'));
  // 16x16 RGB PNG with mild noise
  const px = Buffer.alloc(16 * 16 * 3);
  for (let i = 0; i < px.length; i++) px[i] = (i * 37) % 256;
  await sharp(px, { raw: { width: 16, height: 16, channels: 3 } }).png().toFile(inputPath());
});

after(async () => {
  await rm(dir, { recursive: true, force: true }).catch(() => {});
});

describe('DEFAULT_CLARITY', () => {
  test('matches agreed defaults (denoise off, others off)', () => {
    assert.equal(DEFAULT_CLARITY.denoise, false);
    assert.equal(DEFAULT_CLARITY.denoiseMethod, 'median');
    assert.equal(DEFAULT_CLARITY.denoiseRadius, 1);
    assert.equal(DEFAULT_CLARITY.sharpen, false);
    assert.equal(DEFAULT_CLARITY.enhanceContrast, false);
  });
});

describe('applyClarity (median path)', () => {
  test('denoise only produces a PNG output and runs median step', async () => {
    const out = join(dir, 'out_denoise.png');
    const res = await applyClarity(inputPath(), out, {
      denoise: true,
      denoiseMethod: 'median',
      denoiseRadius: 1,
      sharpen: false,
      enhanceContrast: false,
    });
    const s = await stat(out);
    assert.ok(s.size > 0, 'output file should be non-empty');
    assert.ok(res.steps.some((st) => st.startsWith('denoise:median')), 'should run median denoise');
    assert.equal(res.denoiseFallback, false);
  });

  test('full pipeline (denoise + clahe + sharpen) lists all steps', async () => {
    const out = join(dir, 'out_full.png');
    const res = await applyClarity(inputPath(), out, {
      denoise: true,
      denoiseMethod: 'median',
      denoiseRadius: 2,
      sharpen: true,
      enhanceContrast: true,
    });
    assert.ok(res.steps.some((s) => s.includes('r=2')), 'median radius 2');
    assert.ok(res.steps.includes('clahe'));
    assert.ok(res.steps.includes('sharpen'));
    await stat(out);
  });

  test('all-off clarity still writes a file (passthrough)', async () => {
    const out = join(dir, 'out_passthrough.png');
    const res = await applyClarity(inputPath(), out, {
      denoise: false,
      denoiseMethod: 'median',
      denoiseRadius: 1,
      sharpen: false,
      enhanceContrast: false,
    });
    assert.equal(res.steps.length, 0);
    await stat(out);
  });
});

describe('applyClarity (neural fallback)', () => {
  test('neural method falls back to median when no model available', async () => {
    // ensure no model path
    const saved = process.env.DENOISE_MODEL_PATH;
    delete process.env.DENOISE_MODEL_PATH;
    try {
      const out = join(dir, 'out_neural_fb.png');
      const res = await applyClarity(inputPath(), out, {
        denoise: true,
        denoiseMethod: 'neural',
        denoiseRadius: 1,
        sharpen: false,
        enhanceContrast: false,
      });
      assert.equal(res.denoiseFallback, true, 'should flag fallback');
      assert.ok(res.steps.some((s) => s.includes('fallback')), 'step should mention fallback');
      await stat(out);
    } finally {
      if (saved !== undefined) process.env.DENOISE_MODEL_PATH = saved;
    }
  });
});

describe('denoiseImageNeural', () => {
  test('throws NeuralDenoiseUnavailable without DENOISE_MODEL_PATH', async () => {
    const saved = process.env.DENOISE_MODEL_PATH;
    delete process.env.DENOISE_MODEL_PATH;
    try {
      await assert.rejects(
        () => denoiseImageNeural(inputPath(), join(dir, 'neural.png')),
        (err) => err instanceof NeuralDenoiseUnavailable
      );
    } finally {
      if (saved !== undefined) process.env.DENOISE_MODEL_PATH = saved;
    }
  });
});
