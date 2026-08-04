import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { detectStyle, buildOptimizeSystemPrompt } from '../dist/services/optimizer/stylePresets.js';

describe('detectStyle', () => {
  test('detects anime style', () => {
    assert.equal(detectStyle('anime girl with kawaii eyes'), 'anime');
    assert.equal(detectStyle('chibi manga character'), 'anime');
  });

  test('detects painting style', () => {
    assert.equal(detectStyle('oil painting of a landscape'), 'painting');
    assert.equal(detectStyle('watercolor ink wash'), 'painting');
  });

  test('detects scifi style', () => {
    assert.equal(detectStyle('cyberpunk robot neon city'), 'scifi');
    assert.equal(detectStyle('space galaxy mech'), 'scifi');
  });

  test('detects portrait style', () => {
    assert.equal(detectStyle('portrait of a woman'), 'portrait');
    assert.equal(detectStyle('a model with a face'), 'portrait');
  });

  test('defaults to realistic for unmatched prompts', () => {
    assert.equal(detectStyle('a red apple on wood table'), 'realistic');
  });
});

describe('buildOptimizeSystemPrompt', () => {
  test('includes the style strategy', () => {
    const prompt = buildOptimizeSystemPrompt('anime', 30);
    assert.match(prompt, /keep character traits/);
  });

  test('includes the target word count', () => {
    const prompt = buildOptimizeSystemPrompt('realistic', 25);
    assert.match(prompt, /under 25 words/);
  });

  test('falls back to realistic strategy for unknown styles', () => {
    const prompt = buildOptimizeSystemPrompt('unknown-style', 30);
    assert.match(prompt, /keep material\/lighting words/);
  });
});