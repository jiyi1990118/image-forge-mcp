import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { handleGenerateImage } from '../dist/tools/generateImage.js';
import { selectRealEsrganModel } from '../dist/services/upscale/modelSelectionService.js';

async function withStubbedFetch(fn) {
  const oldFetch = globalThis.fetch;
  const png = await sharp({ create: { width: 4, height: 3, channels: 4, background: '#336699ff' } })
    .png()
    .toBuffer();

  globalThis.fetch = async () => new Response(png, { headers: { 'content-type': 'image/png' } });
  try {
    return await fn();
  } finally {
    globalThis.fetch = oldFetch;
  }
}

describe('handleGenerateImage returnMode and enhancement pipeline', () => {
  test('selectRealEsrganModel defaults non-photo generated images to animevideov3', () => {
    assert.equal(selectRealEsrganModel('anime character illustration', 'auto'), 'realesr-animevideov3');
    assert.equal(selectRealEsrganModel('anime half-body portrait of a senior frontend engineer', 'auto'), 'realesr-animevideov3');
    assert.equal(selectRealEsrganModel('digital art portrait with abstract UI shapes', 'auto'), 'realesr-animevideov3');
    assert.equal(selectRealEsrganModel('quiet watercolor landscape', 'auto'), 'realesr-animevideov3');
  });

  test('selectRealEsrganModel defaults photo and realistic prompts to animevideov3', () => {
    assert.equal(selectRealEsrganModel('realistic portrait photo taken with a camera', 'auto'), 'realesr-animevideov3');
    assert.equal(selectRealEsrganModel('写实 人像 摄影', 'auto'), 'realesr-animevideov3');
  });

  test('selectRealEsrganModel defaults asset and icon prompts to animevideov3', () => {
    assert.equal(selectRealEsrganModel('game item icon sprite asset', 'auto'), 'realesr-animevideov3');
    assert.equal(selectRealEsrganModel('道具 图标 贴图 素材', 'auto'), 'realesr-animevideov3');
    assert.equal(selectRealEsrganModel('anime 2D game asset dragon-slaying broadsword particle effects', 'auto'), 'realesr-animevideov3');
  });

  test('selectRealEsrganModel defaults explicit asset upscaling intent to animevideov3', () => {
    assert.equal(selectRealEsrganModel('game item icon sprite asset upscale', 'auto'), 'realesr-animevideov3');
    assert.equal(selectRealEsrganModel('道具 图标 素材 超分 放大', 'auto'), 'realesr-animevideov3');
  });

  test('selectRealEsrganModel defaults soft ink and watercolor assets to animevideov3', () => {
    assert.equal(selectRealEsrganModel('small penguin colorful Chinese ink wash game asset', 'auto'), 'realesr-animevideov3');
    assert.equal(selectRealEsrganModel('watercolor icon with soft brush strokes', 'auto'), 'realesr-animevideov3');
    assert.equal(selectRealEsrganModel('水墨 小企鹅 图标 素材', 'auto'), 'realesr-animevideov3');
  });

  test('selectRealEsrganModel avoids English substring false positives', () => {
    assert.equal(selectRealEsrganModel('iconic realistic portrait photo', 'auto'), 'realesr-animevideov3');
    assert.equal(selectRealEsrganModel('bionic portrait', 'auto'), 'realesr-animevideov3');
    assert.equal(selectRealEsrganModel('endgame realistic photo', 'auto'), 'realesr-animevideov3');
  });

  test('selectRealEsrganModel only treats game as asset intent with asset-like terms', () => {
    assert.equal(selectRealEsrganModel('game screenshot', 'auto'), 'realesr-animevideov3');
    assert.equal(selectRealEsrganModel('realistic game character', 'auto'), 'realesr-animevideov3');
    assert.equal(selectRealEsrganModel('game sprite item', 'auto'), 'realesr-animevideov3');
  });

  test('selectRealEsrganModel does not treat English texture keywords as game assets', () => {
    assert.equal(selectRealEsrganModel('seamless texture material', 'auto'), 'realesr-animevideov3');
    assert.equal(selectRealEsrganModel('stone textures for a wall', 'auto'), 'realesr-animevideov3');
  });

  test('selectRealEsrganModel preserves explicit model overrides', () => {
    assert.equal(selectRealEsrganModel('realistic portrait photo', 'realesr-animevideov3'), 'realesr-animevideov3');
    assert.equal(selectRealEsrganModel('game item icon', 'realesrgan-x4plus'), 'realesrgan-x4plus');
    assert.equal(selectRealEsrganModel('game item icon', 'realesrgan-x4plus-anime'), 'realesrgan-x4plus-anime');
  });

  test('selectRealEsrganModel treats invalid explicit models as auto', () => {
    assert.equal(selectRealEsrganModel('realistic portrait photo', 'invalid-model'), 'realesr-animevideov3');
    assert.equal(selectRealEsrganModel('game item icon', 'invalid-model'), 'realesr-animevideov3');
  });

  test('returnMode path uses auto as the default requested model', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-generate-handler-'));
    try {
      await withStubbedFetch(async () => {
        const result = await handleGenerateImage({
          prompt: 'small test image',
          autoOptimize: false,
          outputPath: dir,
          fileName: 'sample',
          denoise: false,
          enhanceBackend: 'sharp',
          realEsrganScale: 2,
          compress: false,
          returnMode: 'path',
        }, null);

        assert.equal(result.isError, undefined);
        assert.equal(result.content.length, 1);
        assert.equal(result.content[0].type, 'text');
        assert.equal('data' in result.content[0], false);
        assert.doesNotMatch(result.content[0].text, /"data"/);
        assert.match(result.content[0].text, /Raw image saved to:/);
        assert.match(result.content[0].text, /Enhanced image saved to:/);
        assert.match(result.content[0].text, /Final image saved to:/);
        assert.match(result.content[0].text, /Enhancement: Real-ESRGAN model: realesr-animevideov3\. Enhanced with sharp CPU fallback backend\./);
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('returnMode binary returns image content plus minimal final path text', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-generate-handler-'));
    try {
      await withStubbedFetch(async () => {
        const result = await handleGenerateImage({
          prompt: 'small test image',
          autoOptimize: false,
          outputPath: dir,
          fileName: 'sample',
          denoise: false,
          enhanceBackend: 'sharp',
          realEsrganScale: 2,
          compress: false,
          returnMode: 'binary',
        }, null);

        assert.equal(result.content.length, 2);
        assert.equal(result.content[0].type, 'image');
        assert.equal(result.content[0].mimeType, 'image/png');
        assert.ok(result.content[0].data.length > 0);
        assert.equal(result.content[1].type, 'text');
        assert.match(result.content[1].text, /^Final image saved to:/);
        assert.doesNotMatch(result.content[1].text, /Raw image saved to:/);
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('handler enhancement text includes auto-selected model on fallback', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-generate-handler-'));
    try {
      await withStubbedFetch(async () => {
        const result = await handleGenerateImage({
          prompt: 'realistic portrait photo',
          autoOptimize: false,
          outputPath: dir,
          fileName: 'sample',
          denoise: false,
          enhanceBackend: 'auto',
          realEsrganAutoDownload: false,
          compress: false,
          returnMode: 'path',
        }, null);

        assert.match(result.content[0].text, /Enhancement: Real-ESRGAN model: realesr-animevideov3\./);
        assert.match(result.content[0].text, /(Enhanced with|used sharp CPU fallback)/);
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('noTextConstraint defaults on and can be disabled', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-generate-handler-'));
    try {
      await withStubbedFetch(async () => {
        const defaultResult = await handleGenerateImage({
          prompt: 'minimal portrait',
          autoOptimize: false,
          outputPath: dir,
          fileName: 'default_constraint',
          realEsrgan: false,
          compress: false,
          returnMode: 'path',
        }, null);

        assert.match(defaultResult.content[0].text, /No text, no letters, no words/);

        const disabledResult = await handleGenerateImage({
          prompt: 'minimal portrait',
          autoOptimize: false,
          outputPath: dir,
          fileName: 'disabled_constraint',
          noTextConstraint: false,
          realEsrgan: false,
          compress: false,
          returnMode: 'path',
        }, null);

        assert.match(disabledResult.content[0].text, /Generated image from prompt: "minimal portrait"/);
        assert.doesNotMatch(disabledResult.content[0].text, /No text, no letters, no words/);
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('asset prompts add complete subject and clear edge constraints', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-generate-handler-'));
    try {
      await withStubbedFetch(async () => {
        const result = await handleGenerateImage({
          prompt: 'anime 2D dragon-slaying sword game asset',
          autoOptimize: false,
          outputPath: dir,
          fileName: 'asset_constraints',
          realEsrgan: false,
          removeBackground: false,
          compress: false,
          returnMode: 'path',
        }, null);

        assert.match(result.content[0].text, /complete object, fully visible, centered, uncropped/);
        assert.match(result.content[0].text, /clean silhouette, sharp outline, well-defined edges/);
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('weapon asset prompts add single-subject and anti-duplicate constraints', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-generate-handler-'));
    try {
      await withStubbedFetch(async () => {
        const result = await handleGenerateImage({
          prompt: '游戏素材 倚天剑 主体完整 边缘清晰 彩色炫光 背景透明',
          autoOptimize: false,
          outputPath: dir,
          fileName: 'weapon_single_subject_constraints',
          realEsrgan: false,
          removeBackground: false,
          compress: false,
          returnMode: 'path',
        }, null);

        assert.match(result.content[0].text, /single weapon only, one complete object/);
        assert.match(result.content[0].text, /no duplicate weapons, no crossed weapons/);
        assert.match(result.content[0].text, /one blade, one handle, straight continuous blade/);
        assert.match(result.content[0].text, /not a pair/);
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('organic mushroom asset prompts add seamless natural-shape constraints', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-generate-handler-'));
    try {
      await withStubbedFetch(async () => {
        const result = await handleGenerateImage({
          prompt: '赛博朋克风格 雨天的小蘑菇 粉色 游戏素材',
          autoOptimize: false,
          outputPath: dir,
          fileName: 'organic_mushroom_constraints',
          realEsrgan: false,
          removeBackground: false,
          compress: false,
          returnMode: 'path',
        }, null);

        assert.match(result.content[0].text, /single organic object, smooth continuous natural shape/);
        assert.match(result.content[0].text, /seamless stem, no horizontal seam/);
        assert.match(result.content[0].text, /no ring band, no belt, no mechanical joint, no segmented body/);
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('Chinese cultural asset prompts default to qwen-image when model is not explicit', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-generate-handler-'));
    try {
      await withStubbedFetch(async () => {
        const result = await handleGenerateImage({
          prompt: '游戏素材 倚天剑 中国古风神剑',
          autoOptimize: false,
          outputPath: dir,
          fileName: 'qwen_default_chinese_asset',
          realEsrgan: false,
          removeBackground: false,
          compress: false,
          returnMode: 'path',
        }, null);

        assert.match(result.content[0].text, /"model": "qwen-image"/);
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('explicit model overrides qwen-image default for Chinese cultural assets', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-generate-handler-'));
    try {
      await withStubbedFetch(async () => {
        const result = await handleGenerateImage({
          prompt: '游戏素材 倚天剑 中国古风神剑',
          model: 'flux',
          autoOptimize: false,
          outputPath: dir,
          fileName: 'explicit_model_chinese_asset',
          realEsrgan: false,
          removeBackground: false,
          compress: false,
          returnMode: 'path',
        }, null);

        assert.match(result.content[0].text, /"model": "flux"/);
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('asset prompt matching covers common asset terms without substring false positives', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-generate-handler-'));
    try {
      await withStubbedFetch(async () => {
        const weaponResult = await handleGenerateImage({
          prompt: 'fantasy weapon broadsword for inventory',
          autoOptimize: false,
          outputPath: dir,
          fileName: 'weapon_constraints',
          realEsrgan: false,
          compress: false,
          returnMode: 'path',
        }, null);

        assert.match(weaponResult.content[0].text, /complete object, fully visible, centered, uncropped/);

        const iconicResult = await handleGenerateImage({
          prompt: 'iconic realistic portrait photo',
          autoOptimize: false,
          outputPath: dir,
          fileName: 'iconic_no_constraints',
          realEsrgan: false,
          compress: false,
          returnMode: 'path',
        }, null);

        assert.doesNotMatch(iconicResult.content[0].text, /complete object, fully visible/);

        const textureResult = await handleGenerateImage({
          prompt: 'seamless stone texture material',
          autoOptimize: false,
          outputPath: dir,
          fileName: 'texture_no_constraints',
          realEsrgan: false,
          compress: false,
          returnMode: 'path',
        }, null);

        assert.doesNotMatch(textureResult.content[0].text, /complete object, fully visible/);
        assert.doesNotMatch(textureResult.content[0].text, /Background removed:/);
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('asset prompt matching covers fantasy item and equipment terms', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-generate-handler-'));
    try {
      await withStubbedFetch(async () => {
        const fantasyItemResult = await handleGenerateImage({
          prompt: 'ancient relic potion vial crystal orb treasure chest key badge emblem',
          autoOptimize: false,
          outputPath: dir,
          fileName: 'fantasy_item_constraints',
          realEsrgan: false,
          removeBackground: false,
          compress: false,
          returnMode: 'path',
        }, null);

        assert.match(fantasyItemResult.content[0].text, /complete object, fully visible, centered, uncropped/);

        const chineseItemResult = await handleGenerateImage({
          prompt: '护符 戒指 宝石 药水 卷轴 钥匙 金币 徽章 宝箱 头盔 匕首',
          autoOptimize: false,
          outputPath: dir,
          fileName: 'chinese_item_constraints',
          realEsrgan: false,
          removeBackground: false,
          compress: false,
          returnMode: 'path',
        }, null);

        assert.match(chineseItemResult.content[0].text, /complete object, fully visible, centered, uncropped/);
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('handleGenerateImage input validation', () => {
  test('sanitizes fileName to prevent path traversal', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-generate-handler-'));
    try {
      await withStubbedFetch(async () => {
        const result = await handleGenerateImage({
          prompt: 'traversal test',
          autoOptimize: false,
          outputPath: dir,
          fileName: '../../../etc/passwd',
          realEsrgan: false,
          compress: false,
          returnMode: 'path',
        }, null);

        assert.equal(result.isError, undefined);
        assert.doesNotMatch(result.content[0].text, /\.\.\//);
        assert.doesNotMatch(result.content[0].text, /etc\/passwd/);
        assert.match(result.content[0].text, /Raw image saved to:/);
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('clamps width and height to [64, 2048]', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-generate-handler-'));
    try {
      await withStubbedFetch(async () => {
        const result = await handleGenerateImage({
          prompt: 'clamp test',
          autoOptimize: false,
          outputPath: dir,
          fileName: 'clamp',
          width: 99999,
          height: 1,
          realEsrgan: false,
          compress: false,
          returnMode: 'path',
        }, null);

        assert.match(result.content[0].text, /"width": 2048/);
        assert.match(result.content[0].text, /"height": 64/);
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('clamps realEsrganTimeoutMs to [10000, 600000]', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-generate-handler-'));
    try {
      await withStubbedFetch(async () => {
        const result = await handleGenerateImage({
          prompt: 'timeout clamp',
          autoOptimize: false,
          outputPath: dir,
          fileName: 'timeout',
          enhanceBackend: 'sharp',
          realEsrganTimeoutMs: 1,
          compress: false,
          returnMode: 'path',
        }, null);

        assert.equal(result.isError, undefined);
        assert.match(result.content[0].text, /Enhanced with sharp CPU fallback/);
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('handleGenerateImage partial failure', () => {
  test('returns raw path and error when post-processing fails', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-generate-handler-'));
    const oldFetch = globalThis.fetch;
    const oldRealesrganPath = process.env.REALESRGAN_PATH;
    const png = await sharp({ create: { width: 4, height: 3, channels: 4, background: '#336699ff' } })
      .png()
      .toBuffer();
    globalThis.fetch = async () => new Response(png, { headers: { 'content-type': 'image/png' } });
    process.env.REALESRGAN_PATH = `/nonexistent/binary-${Date.now()}`;

    try {
      const result = await handleGenerateImage({
        prompt: 'partial failure test',
        autoOptimize: false,
        outputPath: dir,
        fileName: 'partial',
        enhanceBackend: 'realesrgan',
        enhanceFallback: 'none',
        compress: false,
        returnMode: 'path',
      }, null);

      assert.equal(result.isError, true);
      assert.match(result.content[0].text, /Post-processing failed/);
      assert.match(result.content[0].text, /Raw image saved to:/);
      assert.match(result.content[0].text, /Failed:/);
    } finally {
      globalThis.fetch = oldFetch;
      if (oldRealesrganPath === undefined) delete process.env.REALESRGAN_PATH;
      else process.env.REALESRGAN_PATH = oldRealesrganPath;
      await rm(dir, { recursive: true, force: true });
    }
  });
});
