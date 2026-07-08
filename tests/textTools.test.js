import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  handleListImageModels,
  handleListTextModels,
  handleRespondText,
} from '../dist/tools/textTools.js';
import { handleOptimizePrompt } from '../dist/tools/optimizePrompt.js';

describe('handleListImageModels', () => {
  test('returns available + unavailable models', async () => {
    const res = await handleListImageModels();
    assert.equal(res.content.length, 1);
    const text = res.content[0].text;
    assert.match(text, /Available image models/);
    assert.match(text, /flux:/);
    assert.match(text, /Unavailable/);
    assert.match(text, /nanobanana/);
  });
});

describe('handleListTextModels', () => {
  test('returns openai-fast with reasoning', async () => {
    const res = await handleListTextModels();
    const text = res.content[0].text;
    assert.match(text, /openai-fast/);
    assert.match(text, /reasoning: true/);
  });
});

describe('handleRespondText', () => {
  test('rejects empty prompt without calling the network', async () => {
    const res = await handleRespondText({}, null);
    assert.equal(res.isError, true);
    assert.match(res.content[0].text, /prompt is required/);
  });

  test('rejects whitespace-only prompt', async () => {
    const res = await handleRespondText({ prompt: '   ' }, null);
    assert.equal(res.isError, true);
  });
});

describe('handleOptimizePrompt', () => {
  test('rejects empty prompt without calling the network', async () => {
    const res = await handleOptimizePrompt({}, null);
    assert.equal(res.isError, true);
    assert.match(res.content[0].text, /prompt is required/);
  });
});
