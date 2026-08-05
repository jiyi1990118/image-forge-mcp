import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fetchWithAuth, buildImageUrl } from '../dist/services/pollinations/client.js';

describe('buildImageUrl', () => {
  test('builds a pollinations image URL with all params', () => {
    const url = buildImageUrl('a red apple', 'flux', 42, 1024, 1024, false, false);
    assert.ok(url.startsWith('https://image.pollinations.ai/prompt/a%20red%20apple'));
    assert.ok(url.includes('model=flux'));
    assert.ok(url.includes('seed=42'));
    assert.ok(url.includes('width=1024'));
    assert.ok(url.includes('height=1024'));
    assert.ok(url.includes('nologo=true'));
    assert.ok(url.includes('private=true'));
    assert.ok(url.includes('safe=false'));
  });

  test('includes enhance param only when enabled', () => {
    const withEnhance = buildImageUrl('cat', 'flux', 1, 512, 512, true, false);
    const withoutEnhance = buildImageUrl('cat', 'flux', 1, 512, 512, false, false);
    assert.ok(withEnhance.includes('enhance=true'));
    assert.ok(!withoutEnhance.includes('enhance='));
  });
});

describe('fetchWithAuth', () => {
  test('returns response on first success', async () => {
    const oldFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response('ok', { status: 200 });
    try {
      const response = await fetchWithAuth('https://example.com', null);
      assert.equal(response.status, 200);
    } finally {
      globalThis.fetch = oldFetch;
    }
  });

  test('throws immediately on non-retryable status', async () => {
    const oldFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response('not found', { status: 404 });
    try {
      await assert.rejects(fetchWithAuth('https://example.com', null), /HTTP 404/);
    } finally {
      globalThis.fetch = oldFetch;
    }
  });

  test('adds Authorization and Referer headers when authConfig provided', async () => {
    const oldFetch = globalThis.fetch;
    let capturedHeaders = null;
    globalThis.fetch = async (url, options) => {
      capturedHeaders = options.headers;
      return new Response('ok', { status: 200 });
    };
    try {
      await fetchWithAuth('https://example.com', { token: 'secret', referrer: 'https://ref.example.com' });
      assert.ok(capturedHeaders instanceof Headers);
      assert.equal(capturedHeaders.get('Authorization'), 'Bearer secret');
      assert.equal(capturedHeaders.get('Referer'), 'https://ref.example.com');
    } finally {
      globalThis.fetch = oldFetch;
    }
  });

  test('retries on 500 then succeeds on second attempt', async () => {
    const oldFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      if (calls === 1) return new Response('server error', { status: 500 });
      return new Response('ok', { status: 200 });
    };
    try {
      const response = await fetchWithAuth('https://example.com', null);
      assert.equal(response.status, 200);
      assert.equal(calls, 2);
    } finally {
      globalThis.fetch = oldFetch;
    }
  });
});