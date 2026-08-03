import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getAllToolSchemas } from '../dist/schemas/index.js';

describe('schema registry', () => {
  test('registers exactly 4 tools', () => {
    const schemas = getAllToolSchemas();
    assert.equal(schemas.length, 4);
  });

  test('tool set is generateImage, generateImageUrl, listImageModels, listTextModels', () => {
    const names = getAllToolSchemas().map((s) => s.name);
    assert.deepEqual(names, [
      'generateImage',
      'generateImageUrl',
      'listImageModels',
      'listTextModels',
    ]);
  });

  test('removed tools are absent', () => {
    const names = getAllToolSchemas().map((s) => s.name);
    assert.ok(!names.includes('enhanceImage'), 'enhanceImage tool should be removed');
    assert.ok(!names.includes('optimizePrompt'), 'optimizePrompt tool should be removed');
    assert.ok(!names.includes('respondText'), 'respondText tool should be removed');
    assert.ok(!names.includes('removeBackground'), 'removeBackground tool should be removed');
    assert.ok(!names.includes('convertImage'), 'convertImage tool should be removed');
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
    assert.match(s.description, /Real-ESRGAN/i);
    assert.match(s.description, /sharp CPU/i);
    assert.match(s.description, /background removal/i);
    assert.match(s.description, /PNG compression/i);
    assert.match(s.description, /returnMode=binary/i);
    assert.match(s.description, /raw image/i);
    assert.match(s.description, /_processed\.png/i);
    assert.match(s.description, /_enhanced\.png/i);
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
    assert.match(enhancementDocs, /realEsrgan=false disables/i);
    assert.match(enhancementDocs, /auto=tries Real-ESRGAN first/i);
    assert.match(enhancementDocs, /falls back to sharp/i);
    assert.match(enhancementDocs, /realesrgan=no fallback/i);
    assert.match(enhancementDocs, /none=surface error/i);
  });

  test('generateImage schema documents auto Real-ESRGAN model selection', () => {
    const s = getAllToolSchemas().find((x) => x.name === 'generateImage');
    const p = s.inputSchema.properties;
    const docs = `${s.description}\n${p.realEsrganModel.description}`;
    assert.match(docs, /auto=realesr-animevideov3/i);
    assert.match(docs, /Explicit overrides auto/i);
  });

  test('generateImage schema documents automatic asset prompt constraints', () => {
    const s = getAllToolSchemas().find((x) => x.name === 'generateImage');
    assert.match(s.description, /asset keywords/i);
    assert.match(s.description, /trigger auto-constraints/i);
    assert.match(s.description, /icon, asset, weapon/i);
  });

  test('generateImage description includes free tier warning', () => {
    const s = getAllToolSchemas().find((x) => x.name === 'generateImage');
    assert.match(s.description, /FREE TIER/i);
    assert.match(s.description, /768px/i);
    assert.match(s.description, /ONE clear subject/i);
  });
});