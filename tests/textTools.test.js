import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  handleListImageModels,
  handleListTextModels,
} from '../dist/tools/textTools.js';

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