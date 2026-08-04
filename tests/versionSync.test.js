import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { SERVER_VERSION } from '../dist/server.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json');

describe('version sync', () => {
  test('server version matches package.json version', () => {
    assert.equal(SERVER_VERSION, packageJson.version);
  });

  test('server version is a non-empty semver-like string', () => {
    assert.match(SERVER_VERSION, /^\d+\.\d+\.\d+/);
  });
});
