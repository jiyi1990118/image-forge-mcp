import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { noBackgroundOutputPath } from '../dist/utils/pathUtils.js';

describe('noBackgroundOutputPath', () => {
  test('uses _nobg.png for PNG input', () => {
    assert.equal(
      noBackgroundOutputPath(join('/tmp', 'image.png')),
      join('/tmp', 'image_nobg.png')
    );
  });

  test('uses _nobg.png for non-PNG input', () => {
    assert.equal(
      noBackgroundOutputPath(join('/tmp', 'image.webp')),
      join('/tmp', 'image_nobg.png')
    );
  });
});
