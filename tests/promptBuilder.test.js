import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildGenerationPrompt } from '../dist/services/pipeline/promptBuilder.js';

describe('buildGenerationPrompt', () => {
  test('appends no-text constraint by default', async () => {
    const result = await buildGenerationPrompt('a cute cartoon cat', {}, null);
    assert.match(result.generationPrompt, /No text, no letters, no words/);
    assert.equal(result.optimizedFrom, null);
  });

  test('respects noTextConstraint=false', async () => {
    const result = await buildGenerationPrompt('a cute cartoon cat', { noTextConstraint: false }, null);
    assert.doesNotMatch(result.generationPrompt, /No text, no letters/);
  });

  test('adds asset constraints for asset prompts', async () => {
    const result = await buildGenerationPrompt('game icon sword', {}, null);
    assert.match(result.generationPrompt, /complete object, fully visible, centered, uncropped/);
  });

  test('does not auto-optimize short prompts', async () => {
    const result = await buildGenerationPrompt('a red apple', { autoOptimize: true }, null);
    assert.equal(result.optimizedFrom, null);
    assert.match(result.generationPrompt, /a red apple/);
  });

  test('skips optimization when autoOptimize=false', async () => {
    const longPrompt = 'a '.repeat(50) + 'red apple';
    const result = await buildGenerationPrompt(longPrompt, { autoOptimize: false }, null);
    assert.equal(result.optimizedFrom, null);
    assert.match(result.generationPrompt, /a red apple/);
  });
});