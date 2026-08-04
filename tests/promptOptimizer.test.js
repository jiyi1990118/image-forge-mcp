import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { shouldOptimize, countWords, optimizePrompt } from '../dist/services/optimizer/promptOptimizer.js';

describe('countWords', () => {
  test('counts whitespace-separated words', () => {
    assert.equal(countWords('a red apple'), 3);
    assert.equal(countWords(''), 0);
    assert.equal(countWords('   '), 0);
  });
});

describe('shouldOptimize', () => {
  test('optimizes prompts over 40 words', () => {
    const longPrompt = 'a '.repeat(41) + 'cat';
    assert.equal(shouldOptimize(longPrompt), true);
  });

  test('does not optimize short prompts', () => {
    assert.equal(shouldOptimize('a red apple'), false);
  });

  test('optimizes prompts with many CJK characters', () => {
    const cjkPrompt = '夸'.repeat(61);
    assert.equal(shouldOptimize(cjkPrompt), true);
  });
});

describe('optimizePrompt', () => {
  test('falls back to original prompt on API failure', async () => {
    const oldFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response('{}', { status: 500 });

    try {
      const result = await optimizePrompt('this is a test prompt that should fail', 'auto', 30, null);
      assert.equal(result.optimizationFailed, true);
      assert.equal(result.optimizedPrompt, 'this is a test prompt that should fail');
      assert.equal(result.compressionRatio, 1);
    } finally {
      globalThis.fetch = oldFetch;
    }
  });

  test('returns optimized prompt on success', async () => {
    const oldFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: 'a red apple' } }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    try {
      const result = await optimizePrompt('a very detailed description of a red apple on a wooden table', 'auto', 30, null);
      assert.equal(result.optimizationFailed, undefined);
      assert.equal(result.optimizedPrompt, 'a red apple');
      assert.ok(result.originalWords > result.optimizedWords);
    } finally {
      globalThis.fetch = oldFetch;
    }
  });
});