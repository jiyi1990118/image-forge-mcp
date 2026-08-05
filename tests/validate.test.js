import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { clamp, clampNumber, sanitizeFileName } from '../dist/utils/validate.js';

describe('clamp', () => {
  test('clamps values into range', () => {
    assert.equal(clamp(5, 0, 10), 5);
    assert.equal(clamp(-1, 0, 10), 0);
    assert.equal(clamp(11, 0, 10), 10);
  });
});

describe('clampNumber', () => {
  test('clamps numeric values', () => {
    assert.equal(clampNumber(5, 1, 1, 10), 5);
    assert.equal(clampNumber('7', 1, 1, 10), 7);
  });

  test('falls back on NaN, Infinity, and non-numeric input', () => {
    assert.equal(clampNumber('abc', 42, 1, 10), 42);
    assert.equal(clampNumber(Number.NaN, 42, 1, 10), 42);
    assert.equal(clampNumber(Number.POSITIVE_INFINITY, 42, 1, 10), 42);
    assert.equal(clampNumber(undefined, 42, 1, 10), 42);
  });
});

describe('sanitizeFileName', () => {
  test('strips path separators to prevent traversal', () => {
    assert.equal(sanitizeFileName('../../../etc/passwd'), 'etcpasswd');
    assert.equal(sanitizeFileName('..\\..\\secret'), 'secret');
  });

  test('keeps normal names intact', () => {
    assert.equal(sanitizeFileName('my-image.png'), 'my-image.png');
  });
});