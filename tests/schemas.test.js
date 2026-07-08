import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getAllToolSchemas } from '../dist/schemas/index.js';

describe('schema registry', () => {
  test('registers exactly 7 tools', () => {
    const schemas = getAllToolSchemas();
    assert.equal(schemas.length, 7);
  });

  test('tool set matches the documented 7-tool design', () => {
    const names = getAllToolSchemas().map((s) => s.name);
    assert.deepEqual(names, [
      'generateImage',
      'generateImageUrl',
      'enhanceImage',
      'optimizePrompt',
      'listImageModels',
      'listTextModels',
      'respondText',
    ]);
  });

  test('removed standalone tools are absent', () => {
    const names = getAllToolSchemas().map((s) => s.name);
    assert.ok(!names.includes('removeBackground'), 'removeBackground tool should be removed (now a generateImage param)');
    assert.ok(!names.includes('convertImage'), 'convertImage tool should be removed (now generateImage params)');
    assert.ok(!names.includes('generateImageHD'), 'generateImageHD should be removed');
  });

  test('every schema declares a valid inputSchema object', () => {
    for (const s of getAllToolSchemas()) {
      assert.equal(s.inputSchema.type, 'object', `${s.name} inputSchema must be object`);
      assert.ok(typeof s.inputSchema.properties === 'object', `${s.name} needs properties`);
      assert.ok(s.description.length > 50, `${s.name} description too short`);
    }
  });

  test('generateImage exposes the post-processing params with correct defaults', () => {
    const s = getAllToolSchemas().find((x) => x.name === 'generateImage');
    const p = s.inputSchema.properties;
    assert.equal(p.denoise.default, false, 'denoise defaults false');
    assert.equal(p.denoiseMethod.default, 'median', 'denoiseMethod defaults median');
    assert.deepEqual(p.denoiseMethod.enum, ['median', 'neural']);
    assert.equal(p.denoiseRadius.default, 1);
    assert.equal(p.sharpen.default, false, 'sharpen defaults false');
    assert.equal(p.enhanceContrast.default, false, 'enhanceContrast defaults false');
    assert.equal(p.removeBackground.default, false, 'removeBackground defaults false');
    assert.equal(p.removeBackgroundStrategy.default, 'auto', 'removeBackgroundStrategy defaults auto');
    assert.deepEqual(p.removeBackgroundStrategy.enum, ['auto', 'default', 'preserve-light-subject', 'clean-edge']);
    assert.equal(p.compress.default, true, 'compress defaults true');
    assert.equal(p.noTextConstraint.default, true, 'noTextConstraint defaults true');
  });

  test('generateImage exposes Real-ESRGAN enhancement and output mode defaults', () => {
    const s = getAllToolSchemas().find((x) => x.name === 'generateImage');
    const p = s.inputSchema.properties;
    assert.equal(p.realEsrgan.default, true, 'realEsrgan defaults true');
    assert.equal(p.enhanceBackend.default, 'auto', 'enhanceBackend defaults auto');
    assert.deepEqual(p.enhanceBackend.enum, ['auto', 'realesrgan', 'sharp', 'none']);
    assert.equal(p.enhanceFallback.default, 'sharp', 'enhanceFallback defaults sharp');
    assert.deepEqual(p.enhanceFallback.enum, ['sharp', 'none']);
    assert.equal(p.realEsrganModel.default, 'auto');
    assert.deepEqual(p.realEsrganModel.enum, [
      'auto', 'realesrgan-x4plus', 'realesrgan-x4plus-anime', 'realesr-animevideov3',
    ]);
    assert.equal(p.realEsrganScale.default, 2);
    assert.deepEqual(p.realEsrganScale.enum, [2, 3, 4]);
    assert.equal(p.realEsrganAutoDownload.default, true);
    assert.equal(p.realEsrganTimeoutMs.default, 120000);
    assert.equal(p.returnMode.default, 'path', 'returnMode defaults path');
    assert.deepEqual(p.returnMode.enum, ['path', 'binary', 'both']);
  });

  test('generateImage description documents default enhancement and path return behavior', () => {
    const s = getAllToolSchemas().find((x) => x.name === 'generateImage');
    assert.match(s.description, /raw generation/i);
    assert.match(s.description, /Real-ESRGAN when available/i);
    assert.match(s.description, /sharp CPU fallback/i);
    assert.match(s.description, /optional background removal/i);
    assert.match(s.description, /PNG compression/i);
    assert.match(s.description, /returns paths unless returnMode requests binary/i);
    assert.match(s.description, /raw generated image/i);
    assert.match(s.description, /clarity processed PNG/i);
    assert.match(s.description, /enhanced final PNG/i);
    assert.match(s.description, /background removal is enabled, it runs after enhancement/i);
    assert.doesNotMatch(s.description, /TWO files/i);
    assert.doesNotMatch(s.description, /transparent _processed\.png/i);
  });

  test('generateImage schema documents enhancement precedence and fallback semantics', () => {
    const s = getAllToolSchemas().find((x) => x.name === 'generateImage');
    const p = s.inputSchema.properties;
    const enhancementDocs = [
      s.description,
      p.realEsrgan.description,
      p.enhanceBackend.description,
      p.enhanceFallback.description,
    ].join('\n');
    assert.match(enhancementDocs, /realEsrgan=false disables generated-image enhancement regardless of enhanceBackend/i);
    assert.match(enhancementDocs, /enhanceBackend='none' also disables generated-image enhancement/i);
    assert.match(enhancementDocs, /enhanceBackend='auto' tries Real-ESRGAN first, then uses enhanceFallback/i);
    assert.match(enhancementDocs, /enhanceFallback='sharp' uses CPU sharp fallback/i);
    assert.match(enhancementDocs, /enhanceFallback='none' returns or propagates the Real-ESRGAN error/i);
    assert.match(enhancementDocs, /enhanceBackend='realesrgan' does not silently fallback/i);
  });

  test('generateImage schema documents auto Real-ESRGAN model selection', () => {
    const s = getAllToolSchemas().find((x) => x.name === 'generateImage');
    const p = s.inputSchema.properties;
    const docs = `${s.description}\n${p.realEsrganModel.description}`;
    assert.match(docs, /realEsrganModel: enum \(optional, default: auto\)/i);
    assert.match(docs, /auto\|realesrgan-x4plus\|realesrgan-x4plus-anime\|realesr-animevideov3/i);
    assert.match(docs, /default generated images, stylized prompts \(anime\/manga\/cartoon\/illustration\/painting\/digital art\), soft watercolor\/ink\/brush prompts, and asset\/icon\/item\/sprite\/weapon\/equipment prompts by default/i);
    assert.match(docs, /only when those asset-style prompts also explicitly mention upscaling\/enlarging\/super-resolution/i);
    assert.match(docs, /strong photo prompts \(photo\/photograph\/realistic\/photorealistic\/camera\/DSLR\/lens\)/i);
    assert.match(docs, /portrait is (treated as )?composition, not a photo signal/i);
  });

  test('generateImage schema documents automatic asset prompt constraints', () => {
    const s = getAllToolSchemas().find((x) => x.name === 'generateImage');
    assert.match(s.description, /asset\/icon\/item\/sprite\/weapon\/equipment prompts automatically add complete-object and sharp-edge generation constraints/i);
    assert.match(s.description, /fully visible/i);
    assert.match(s.description, /well-defined edges/i);
  });

  test('optimizePrompt schema requires prompt and exposes style/targetWords', () => {
    const s = getAllToolSchemas().find((x) => x.name === 'optimizePrompt');
    assert.ok(s.inputSchema.required.includes('prompt'));
    assert.deepEqual(s.inputSchema.properties.style.enum, [
      'auto', 'realistic', 'anime', 'painting', 'scifi', 'portrait',
    ]);
    assert.equal(s.inputSchema.properties.targetWords.default, 30);
  });

  test('enhanceImage schema exposes Real-ESRGAN defaults', () => {
    const s = getAllToolSchemas().find((x) => x.name === 'enhanceImage');
    assert.ok(s.inputSchema.required.includes('inputPath'));
    assert.equal(s.inputSchema.properties.model.default, 'realesrgan-x4plus-anime');
    assert.deepEqual(s.inputSchema.properties.model.enum, [
      'realesrgan-x4plus', 'realesrgan-x4plus-anime', 'realesr-animevideov3',
    ]);
    assert.equal(s.inputSchema.properties.scale.default, 2);
    assert.deepEqual(s.inputSchema.properties.scale.enum, [2, 3, 4]);
    assert.equal(s.inputSchema.properties.autoDownload.default, true);
    assert.equal(s.inputSchema.properties.removeBackground.default, false);
  });

  test('enhanceImage schema documents actual Real-ESRGAN cache location', () => {
    const s = getAllToolSchemas().find((x) => x.name === 'enhanceImage');
    assert.match(s.description, /\.cache\/realesrgan\/v0\.2\.5\.0\/<platform>/);
    assert.match(s.description, /REALESRGAN_CACHE_DIR overrides the cache root/);
    assert.doesNotMatch(s.description, /~\/\.cache\/vision-mcp/);
  });
});
