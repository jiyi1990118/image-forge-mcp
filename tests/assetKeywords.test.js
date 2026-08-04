import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldUseAssetPipeline,
  addAssetConstraint,
  addNoTextConstraint,
  selectImageModel,
  shouldApplyNoTextConstraint,
} from '../dist/config/assetKeywords.js';

describe('shouldUseAssetPipeline', () => {
  test('detects English asset keywords via token match', () => {
    assert.equal(shouldUseAssetPipeline('game item icon sprite'), true);
    assert.equal(shouldUseAssetPipeline('fantasy weapon broadsword'), true);
  });

  test('avoids English substring false positives', () => {
    assert.equal(shouldUseAssetPipeline('iconic realistic portrait'), false);
    assert.equal(shouldUseAssetPipeline('seamless stone texture'), false);
    assert.equal(shouldUseAssetPipeline('bionic portrait'), false);
  });

  test('detects Chinese asset keywords', () => {
    assert.equal(shouldUseAssetPipeline('游戏素材 道具 图标'), true);
    assert.equal(shouldUseAssetPipeline('倚天剑 神兵'), true);
  });
});

describe('addAssetConstraint', () => {
  test('adds complete-object constraints for asset prompts', () => {
    const result = addAssetConstraint('game item icon sword');
    assert.match(result, /complete object, fully visible, centered, uncropped/);
    assert.match(result, /clean silhouette, sharp outline, well-defined edges/);
  });

  test('adds plain white background when no background color mentioned', () => {
    const result = addAssetConstraint('game item icon');
    assert.match(result, /plain white background/);
  });

  test('omits background instruction when background already specified', () => {
    const result = addAssetConstraint('game item icon on black background');
    assert.doesNotMatch(result, /plain white background/);
  });

  test('adds weapon and bladed constraints for weapon prompts', () => {
    const result = addAssetConstraint('game icon sword');
    assert.match(result, /single weapon only, one complete object/);
    assert.match(result, /one blade, one handle, straight continuous blade/);
  });

  test('adds organic constraints for mushroom prompts', () => {
    const result = addAssetConstraint('pink mushroom game asset');
    assert.match(result, /single organic object, smooth continuous natural shape/);
  });

  test('returns prompt unchanged for non-asset prompts', () => {
    const prompt = 'a red apple on wood table';
    assert.equal(addAssetConstraint(prompt), prompt);
  });
});

describe('addNoTextConstraint', () => {
  test('appends no-text guidance', () => {
    const result = addNoTextConstraint('a cute cat');
    assert.match(result, /No text, no letters, no words/);
  });
});

describe('selectImageModel', () => {
  test('explicit model wins', () => {
    assert.equal(selectImageModel('anything', 'flux'), 'flux');
  });

  test('defaults to culture-aware model for Chinese cultural assets', () => {
    assert.equal(selectImageModel('游戏素材 倚天剑 中国古风神剑', undefined), 'qwen-image');
  });

  test('defaults to DEFAULTS.IMAGE_MODEL for non-cultural prompts', () => {
    const result = selectImageModel('a red apple', undefined);
    assert.equal(typeof result, 'string');
  });
});

describe('shouldApplyNoTextConstraint', () => {
  test('defaults on, can be disabled with false', () => {
    assert.equal(shouldApplyNoTextConstraint(undefined), true);
    assert.equal(shouldApplyNoTextConstraint(true), true);
    assert.equal(shouldApplyNoTextConstraint(false), false);
  });
});