import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { hwcToChw, chwToHwc } from '../dist/services/enhance/denoiseService.js';

describe('hwcToChw', () => {
  test('converts HWC uint8 to CHW float32 [0,1]', () => {
    const width = 2;
    const height = 1;
    const rgb = Buffer.from([255, 0, 0, 0, 128, 255]);
    const result = hwcToChw(rgb, width, height);

    assert.equal(result.length, 3 * width * height);
    // channel 0 (R): pixel0=255/255=1.0, pixel1=0/255=0.0
    assert.equal(result[0], 1.0);
    assert.equal(result[1], 0.0);
    // channel 1 (G): pixel0=0, pixel1=128/255
    assert.equal(result[2], 0.0);
    assert.ok(Math.abs(result[3] - 128 / 255) < 1e-6);
    // channel 2 (B): pixel0=0, pixel1=1.0
    assert.equal(result[4], 0.0);
    assert.equal(result[5], 1.0);
  });
});

describe('chwToHwc', () => {
  test('converts CHW float32 back to HWC uint8 with clamping', () => {
    const width = 2;
    const height = 1;
    const output = new Float32Array([1.0, 0.0, 0.0, 0.5, 0.0, 1.0]);
    const result = chwToHwc(output, width, height);

    assert.equal(result.length, 3 * width * height);
    assert.deepEqual([...result], [255, 0, 0, 0, 128, 255]);
  });

  test('clamps out-of-range model output to [0,255]', () => {
    const width = 1;
    const height = 1;
    const output = new Float32Array([-0.5, 1.5, 0.5]);
    const result = chwToHwc(output, width, height);

    assert.deepEqual([...result], [0, 255, 128]);
  });

  test('round-trips HWC<uint8> -> CHW<float32> -> HWC<uint8> losslessly', () => {
    const width = 4;
    const height = 4;
    const data = Buffer.alloc(4 * 4 * 3);
    for (let i = 0; i < 4 * 4; i++) {
      data[i * 3] = (i * 20) % 256;
      data[i * 3 + 1] = (i * 7) % 256;
      data[i * 3 + 2] = (i * 13) % 256;
    }
    const chw = hwcToChw(data, width, height);
    const hwc = chwToHwc(chw, width, height);
    assert.deepEqual(hwc, data);
  });
});