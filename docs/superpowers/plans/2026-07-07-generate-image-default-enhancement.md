# GenerateImage Default Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `generateImage` default to enhanced local-file output: generate raw image, apply Real-ESRGAN when the environment supports it, fall back to CPU `sharp` resize when Vulkan/Real-ESRGAN is unavailable, optionally remove background, compress by default, and return a local path by default with optional binary output.

**Architecture:** Keep `enhanceImage` as the standalone existing-image tool, but extract reusable enhancement behavior into services that `generateImage` can call. Add an environment probe for Real-ESRGAN/Vulkan capability and a fallback enhancement path using `sharp.resize`. `generateImage` will orchestrate the pipeline and expose explicit parameters for backend, fallback, output mode, Real-ESRGAN model/scale, background removal, and compression.

**Tech Stack:** TypeScript ESM, MCP SDK stdio, Pollinations image API, `sharp`, `@imgly/background-removal-node`, imagemin pngquant/zopfli, Real-ESRGAN ncnn-vulkan.

## Global Constraints

- Preserve stdio safety: never write logs to stdout; use `log()` / stderr only.
- Do not add Python/PyTorch dependencies in this phase.
- Real-ESRGAN remains optional and must not make unsupported machines unusable.
- Default `generateImage` output mode is local path text, not image binary.
- `compress` defaults to `true`.
- `removeBackground` remains explicit or keyword auto-detected; background removal runs after enhancement.
- `sharpen` and `enhanceContrast` default to `false`.
- Real-ESRGAN default settings: `realEsrgan=true`, `realEsrganScale=2`, `realEsrganModel='auto'`, `realEsrganAutoDownload=true`, `realEsrganTimeoutMs=120000`.
- Fallback behavior: if Real-ESRGAN/Vulkan is unavailable or enhancement fails, default to CPU `sharp` resize fallback and report that fallback in metadata text.
- `enhanceImage` standalone behavior remains available and compatible.

---

## File Structure

- Modify: `src/services/upscale/realesrganService.ts`
  - Export environment probing helpers and a non-throwing availability check.
  - Keep existing `enhanceWithRealEsrgan` behavior for direct tool use.
- Create: `src/services/upscale/fallbackUpscaleService.ts`
  - CPU fallback using `sharp.resize` with Lanczos3, preserving alpha.
- Create: `src/services/upscale/generationEnhancementService.ts`
  - Reusable enhancement orchestrator for `generateImage`: Real-ESRGAN first, fallback to sharp when configured.
- Modify: `src/tools/generateImage.ts`
  - Add output mode, enhancement params, pipeline ordering, and local-path default response.
- Modify: `src/schemas/imageSchemas.ts`
  - Document new params and defaults.
- Modify: `tests/realesrgan.test.js`
  - Add availability/probe tests where no binary is required.
- Create: `tests/fallbackUpscale.test.js`
  - Verify CPU fallback creates PNG and scales dimensions.
- Create: `tests/generateImageSchema.test.js` or extend `tests/schemas.test.js`
  - Verify new `generateImage` schema params/defaults.
- Modify docs after code behavior is green:
  - `README.md`
  - `AGENTS.md`
  - `docs/reference/tools.md`
  - `docs/reference/env-vars.md`
  - `docs/architecture/overview.md`
  - `docs/architecture/tool-design.md`
  - `docs/guides/installation.md`

---

### Task 1: Real-ESRGAN Environment Probe

**Files:**
- Modify: `src/services/upscale/realesrganService.ts`
- Test: `tests/realesrgan.test.js`

**Interfaces:**
- Produces: `checkRealEsrganAvailability(options?: { autoDownload?: boolean }): Promise<RealEsrganAvailability>`
- Produces: `RealEsrganAvailability = { supportedPlatform: boolean; binaryAvailable: boolean; binaryPath?: string; downloaded: boolean; vulkanLikelyAvailable: boolean; available: boolean; reason?: string }`
- Consumes: existing `getRealEsrganPackageInfo`, `ensureRealEsrgan` logic.

- [ ] **Step 1: Write failing tests for unsupported platform and no auto-download path**

Add to `tests/realesrgan.test.js`:

```js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getRealEsrganPackageInfo,
  checkRealEsrganAvailability,
} from '../dist/services/upscale/realesrganService.js';

// Keep existing tests. Add this block below the existing getRealEsrganPackageInfo tests.

describe('checkRealEsrganAvailability', () => {
  test('reports unavailable without downloading when binary is missing', async () => {
    const oldPath = process.env.REALESRGAN_PATH;
    const oldCache = process.env.REALESRGAN_CACHE_DIR;
    delete process.env.REALESRGAN_PATH;
    process.env.REALESRGAN_CACHE_DIR = '/tmp/vision-mcp-test-missing-realesrgan';

    try {
      const result = await checkRealEsrganAvailability({ autoDownload: false });
      assert.equal(result.supportedPlatform, true);
      assert.equal(result.binaryAvailable, false);
      assert.equal(result.downloaded, false);
      assert.equal(result.available, false);
      assert.match(result.reason || '', /not found|autoDownload/i);
    } finally {
      if (oldPath === undefined) delete process.env.REALESRGAN_PATH;
      else process.env.REALESRGAN_PATH = oldPath;
      if (oldCache === undefined) delete process.env.REALESRGAN_CACHE_DIR;
      else process.env.REALESRGAN_CACHE_DIR = oldCache;
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build && npm test`

Expected: FAIL with an export/import error for `checkRealEsrganAvailability`.

- [ ] **Step 3: Implement availability interface and helper**

In `src/services/upscale/realesrganService.ts`, add exports near the existing interfaces:

```ts
export interface RealEsrganAvailability {
  supportedPlatform: boolean;
  binaryAvailable: boolean;
  binaryPath?: string;
  downloaded: boolean;
  vulkanLikelyAvailable: boolean;
  available: boolean;
  reason?: string;
}
```

Change `ensureRealEsrgan` from a private function to an exported function so the probe and generation enhancement service can reuse it:

```ts
export async function ensureRealEsrgan(autoDownload: boolean): Promise<{ binaryPath: string; downloaded: boolean }> {
```

Add this helper before `enhanceWithRealEsrgan`:

```ts
export async function checkRealEsrganAvailability(
  options: { autoDownload?: boolean } = {}
): Promise<RealEsrganAvailability> {
  const autoDownload = options.autoDownload === true;

  try {
    getRealEsrganPackageInfo();
  } catch (error) {
    return {
      supportedPlatform: false,
      binaryAvailable: false,
      downloaded: false,
      vulkanLikelyAvailable: false,
      available: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }

  try {
    const ensured = await ensureRealEsrgan(autoDownload);
    return {
      supportedPlatform: true,
      binaryAvailable: true,
      binaryPath: ensured.binaryPath,
      downloaded: ensured.downloaded,
      // This is a conservative preflight: real Vulkan support is ultimately verified by running the binary.
      vulkanLikelyAvailable: true,
      available: true,
    };
  } catch (error) {
    return {
      supportedPlatform: true,
      binaryAvailable: false,
      downloaded: false,
      vulkanLikelyAvailable: false,
      available: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm run build && npm test`

Expected: PASS for all tests.

- [ ] **Step 5: Commit**

Do not commit unless the user explicitly requested commits. If commits are requested, run:

```bash
git status
git diff
git add src/services/upscale/realesrganService.ts tests/realesrgan.test.js
git commit -m "feat: add realesrgan availability probe"
```

---

### Task 2: CPU Sharp Fallback Upscale Service

**Files:**
- Create: `src/services/upscale/fallbackUpscaleService.ts`
- Test: `tests/fallbackUpscale.test.js`

**Interfaces:**
- Produces: `upscaleWithSharpFallback(options: SharpFallbackUpscaleOptions): Promise<SharpFallbackUpscaleResult>`
- Consumes: `sharp` only.

- [ ] **Step 1: Write failing fallback test**

Create `tests/fallbackUpscale.test.js`:

```js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { upscaleWithSharpFallback } from '../dist/services/upscale/fallbackUpscaleService.js';

describe('upscaleWithSharpFallback', () => {
  test('creates a scaled PNG output with lanczos fallback', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-fallback-'));
    try {
      const inputPath = join(dir, 'input.png');
      const outputPath = join(dir, 'output.png');
      await sharp({ create: { width: 8, height: 6, channels: 4, background: '#ff0000ff' } })
        .png()
        .toFile(inputPath);

      const result = await upscaleWithSharpFallback({ inputPath, outputPath, scale: 2 });
      const meta = await sharp(result.outputPath).metadata();

      assert.equal(result.backend, 'sharp');
      assert.equal(result.scale, 2);
      assert.equal(meta.width, 16);
      assert.equal(meta.height, 12);
      assert.equal(meta.format, 'png');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build && npm test`

Expected: FAIL because `fallbackUpscaleService.js` does not exist.

- [ ] **Step 3: Implement fallback service**

Create `src/services/upscale/fallbackUpscaleService.ts`:

```ts
import { mkdir, stat } from 'fs/promises';
import { dirname } from 'path';
import sharp from 'sharp';

export interface SharpFallbackUpscaleOptions {
  inputPath: string;
  outputPath: string;
  scale: 2 | 3 | 4;
}

export interface SharpFallbackUpscaleResult {
  inputPath: string;
  outputPath: string;
  scale: number;
  backend: 'sharp';
  outputSize: number;
}

export async function upscaleWithSharpFallback(
  options: SharpFallbackUpscaleOptions
): Promise<SharpFallbackUpscaleResult> {
  const meta = await sharp(options.inputPath).metadata();
  if (!meta.width || !meta.height) {
    throw new Error(`Could not read image dimensions: ${options.inputPath}`);
  }

  await mkdir(dirname(options.outputPath), { recursive: true });
  await sharp(options.inputPath)
    .resize({
      width: meta.width * options.scale,
      height: meta.height * options.scale,
      fit: 'fill',
      kernel: sharp.kernel.lanczos3,
    })
    .png({ quality: 95 })
    .toFile(options.outputPath);

  const outputSize = (await stat(options.outputPath)).size;
  return {
    inputPath: options.inputPath,
    outputPath: options.outputPath,
    scale: options.scale,
    backend: 'sharp',
    outputSize,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npm run build && npm test`

Expected: PASS for all tests.

---

### Task 3: Generation Enhancement Orchestrator

**Files:**
- Create: `src/services/upscale/generationEnhancementService.ts`
- Test: `tests/generationEnhancement.test.js`

**Interfaces:**
- Consumes: `enhanceWithRealEsrgan`, `checkRealEsrganAvailability`, `upscaleWithSharpFallback`.
- Produces: `enhanceGeneratedImage(options: EnhanceGeneratedImageOptions): Promise<EnhanceGeneratedImageResult>`.

- [ ] **Step 1: Write tests for fallback path without Real-ESRGAN auto-download**

Create `tests/generationEnhancement.test.js`:

```js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { enhanceGeneratedImage } from '../dist/services/upscale/generationEnhancementService.js';

describe('enhanceGeneratedImage', () => {
  test('falls back to sharp when Real-ESRGAN is unavailable and fallback is sharp', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vision-generation-enhance-'));
    const oldPath = process.env.REALESRGAN_PATH;
    const oldCache = process.env.REALESRGAN_CACHE_DIR;
    delete process.env.REALESRGAN_PATH;
    process.env.REALESRGAN_CACHE_DIR = join(dir, 'missing-cache');

    try {
      const inputPath = join(dir, 'input.png');
      const outputPath = join(dir, 'enhanced.png');
      await sharp({ create: { width: 5, height: 4, channels: 4, background: '#00ff00ff' } })
        .png()
        .toFile(inputPath);

      const result = await enhanceGeneratedImage({
        inputPath,
        outputPath,
        enabled: true,
        backend: 'auto',
        fallback: 'sharp',
        model: 'realesrgan-x4plus-anime',
        scale: 2,
        autoDownload: false,
        timeoutMs: 120000,
      });

      const meta = await sharp(result.outputPath).metadata();
      assert.equal(result.backendUsed, 'sharp');
      assert.equal(result.fallbackUsed, true);
      assert.equal(meta.width, 10);
      assert.equal(meta.height, 8);
      assert.match(result.message, /fallback/i);
    } finally {
      if (oldPath === undefined) delete process.env.REALESRGAN_PATH;
      else process.env.REALESRGAN_PATH = oldPath;
      if (oldCache === undefined) delete process.env.REALESRGAN_CACHE_DIR;
      else process.env.REALESRGAN_CACHE_DIR = oldCache;
      await rm(dir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build && npm test`

Expected: FAIL because `generationEnhancementService.js` does not exist.

- [ ] **Step 3: Implement orchestrator**

Create `src/services/upscale/generationEnhancementService.ts`:

```ts
import { dirname } from 'path';
import { enhanceWithRealEsrgan, type RealEsrganModel } from './realesrganService.js';
import { upscaleWithSharpFallback } from './fallbackUpscaleService.js';

export type EnhancementBackend = 'auto' | 'realesrgan' | 'sharp' | 'none';
export type EnhancementFallback = 'sharp' | 'none';

export interface EnhanceGeneratedImageOptions {
  inputPath: string;
  outputPath: string;
  enabled: boolean;
  backend: EnhancementBackend;
  fallback: EnhancementFallback;
  model: RealEsrganModel;
  scale: 2 | 3 | 4;
  autoDownload: boolean;
  timeoutMs: number;
}

export interface EnhanceGeneratedImageResult {
  inputPath: string;
  outputPath: string;
  backendUsed: 'realesrgan' | 'sharp' | 'none';
  fallbackUsed: boolean;
  scale: number;
  message: string;
  binaryPath?: string;
}

export async function enhanceGeneratedImage(
  options: EnhanceGeneratedImageOptions
): Promise<EnhanceGeneratedImageResult> {
  if (!options.enabled || options.backend === 'none') {
    return {
      inputPath: options.inputPath,
      outputPath: options.inputPath,
      backendUsed: 'none',
      fallbackUsed: false,
      scale: 1,
      message: 'Enhancement disabled.',
    };
  }

  if (options.backend === 'sharp') {
    const fallback = await upscaleWithSharpFallback({
      inputPath: options.inputPath,
      outputPath: options.outputPath,
      scale: options.scale,
    });
    return {
      inputPath: fallback.inputPath,
      outputPath: fallback.outputPath,
      backendUsed: 'sharp',
      fallbackUsed: false,
      scale: fallback.scale,
      message: 'Enhanced with sharp CPU fallback backend.',
    };
  }

  try {
    const realesrgan = await enhanceWithRealEsrgan({
      inputPath: options.inputPath,
      outputPath: options.outputPath,
      model: options.model,
      scale: options.scale,
      autoDownload: options.autoDownload,
      timeoutMs: options.timeoutMs,
    });
    return {
      inputPath: realesrgan.inputPath,
      outputPath: realesrgan.outputPath,
      backendUsed: 'realesrgan',
      fallbackUsed: false,
      scale: realesrgan.scale,
      binaryPath: realesrgan.binaryPath,
      message: `Enhanced with Real-ESRGAN (${realesrgan.model}).`,
    };
  } catch (error) {
    if (options.fallback !== 'sharp' || options.backend === 'realesrgan') {
      throw error;
    }

    const fallback = await upscaleWithSharpFallback({
      inputPath: options.inputPath,
      outputPath: options.outputPath,
      scale: options.scale,
    });
    const reason = error instanceof Error ? error.message : String(error);
    return {
      inputPath: fallback.inputPath,
      outputPath: fallback.outputPath,
      backendUsed: 'sharp',
      fallbackUsed: true,
      scale: fallback.scale,
      message: `Real-ESRGAN unavailable; used sharp CPU fallback. Reason: ${reason}`,
    };
  }
}
```

Remove the unused `dirname` import if TypeScript reports it.

- [ ] **Step 4: Run tests**

Run: `npm run build && npm test`

Expected: PASS for all tests.

---

### Task 4: Schema Parameters for GenerateImage Enhancement and Output Mode

**Files:**
- Modify: `src/schemas/imageSchemas.ts`
- Modify: `tests/schemas.test.js`

**Interfaces:**
- Produces schema properties: `realEsrgan`, `enhanceBackend`, `enhanceFallback`, `realEsrganModel`, `realEsrganScale`, `realEsrganAutoDownload`, `realEsrganTimeoutMs`, `returnMode`.

- [ ] **Step 1: Write failing schema assertions**

Extend the `generateImage exposes the post-processing params with correct defaults` test in `tests/schemas.test.js`:

```js
    assert.equal(p.realEsrgan.default, true, 'realEsrgan defaults true');
    assert.equal(p.enhanceBackend.default, 'auto');
    assert.deepEqual(p.enhanceBackend.enum, ['auto', 'realesrgan', 'sharp', 'none']);
    assert.equal(p.enhanceFallback.default, 'sharp');
    assert.deepEqual(p.enhanceFallback.enum, ['sharp', 'none']);
    assert.equal(p.realEsrganModel.default, 'auto');
    assert.deepEqual(p.realEsrganModel.enum, [
      'auto', 'realesrgan-x4plus', 'realesrgan-x4plus-anime', 'realesr-animevideov3',
    ]);
    assert.equal(p.realEsrganScale.default, 2);
    assert.deepEqual(p.realEsrganScale.enum, [2, 3, 4]);
    assert.equal(p.realEsrganAutoDownload.default, true);
    assert.equal(p.realEsrganTimeoutMs.default, 120000);
    assert.equal(p.returnMode.default, 'path');
    assert.deepEqual(p.returnMode.enum, ['path', 'binary', 'both']);
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run build && npm test`

Expected: FAIL because schema properties are missing.

- [ ] **Step 3: Add schema fields and update description**

In `src/schemas/imageSchemas.ts`, update `generateImageSchema.description` to say:

```text
Default behavior: generate raw image, enhance with Real-ESRGAN when available, fall back to sharp CPU resize if Real-ESRGAN/Vulkan is unavailable, optionally remove background, compress PNG, and return local paths unless returnMode requests binary.
```

Add these properties to `inputSchema.properties` after `removeBackground` and before `compress`:

```ts
      realEsrgan: { type: 'boolean', default: true, description: 'Apply generated-image enhancement by default. Uses Real-ESRGAN when available; can fall back to sharp CPU resize.' },
      enhanceBackend: { type: 'string', default: 'auto', enum: ['auto', 'realesrgan', 'sharp', 'none'], description: 'Generated-image enhancement backend. auto=Real-ESRGAN first, sharp fallback by default.' },
      enhanceFallback: { type: 'string', default: 'sharp', enum: ['sharp', 'none'], description: 'Fallback when auto Real-ESRGAN fails. sharp=CPU resize fallback; none=return error.' },
      realEsrganModel: { type: 'string', default: 'auto', enum: ['auto', 'realesrgan-x4plus', 'realesrgan-x4plus-anime', 'realesr-animevideov3'], description: 'Real-ESRGAN model for generated-image enhancement. auto selects by prompt intent; explicit model values override auto selection.' },
      realEsrganScale: { type: 'number', default: 2, enum: [2, 3, 4], description: 'Enhancement scale for Real-ESRGAN or sharp fallback.' },
      realEsrganAutoDownload: { type: 'boolean', default: true, description: 'Auto-download Real-ESRGAN binary if supported platform and no binary/cache exists.' },
      realEsrganTimeoutMs: { type: 'number', default: 120000, description: 'Real-ESRGAN process timeout in milliseconds.' },
      returnMode: { type: 'string', default: 'path', enum: ['path', 'binary', 'both'], description: 'Response payload mode. path=text with local paths only; binary=image content only; both=image plus text paths.' },
```

- [ ] **Step 4: Run tests**

Run: `npm run build && npm test`

Expected: PASS for all tests.

---

### Task 5: Integrate Enhancement Pipeline into GenerateImage

**Files:**
- Modify: `src/tools/generateImage.ts`
- Test: add targeted unit tests only if existing handler tests can mock services cheaply; otherwise rely on schema/service tests plus build.

**Interfaces:**
- Consumes: `enhanceGeneratedImage` from Task 3.
- Produces: `generateImage` return mode behavior:
  - `returnMode='path'`: only text content with local paths and metadata.
  - `returnMode='binary'`: image content plus minimal text metadata.
  - `returnMode='both'`: image content plus full text paths/metadata.

- [ ] **Step 1: Update imports**

In `src/tools/generateImage.ts`, add:

```ts
import { readFileSync } from 'fs';
import { dirname, basename, extname, join } from 'path';
import { enhanceGeneratedImage, type EnhancementBackend, type EnhancementFallback } from '../services/upscale/generationEnhancementService.js';
import type { RealEsrganModel } from '../services/upscale/realesrganService.js';
```

Remove dynamic imports of `path` and `fs` inside `handleGenerateImage` after the refactor.

- [ ] **Step 2: Add local parsing helpers**

Add below `addNoTextConstraint`:

```ts
function parseScale(value: unknown): 2 | 3 | 4 {
  const numeric = Number(value || 2);
  return numeric === 3 || numeric === 4 ? numeric : 2;
}

function parseReturnMode(value: unknown): 'path' | 'binary' | 'both' {
  return value === 'binary' || value === 'both' ? value : 'path';
}

function parseEnhanceBackend(value: unknown): EnhancementBackend {
  return value === 'realesrgan' || value === 'sharp' || value === 'none' ? value : 'auto';
}

function parseEnhanceFallback(value: unknown): EnhancementFallback {
  return value === 'none' ? 'none' : 'sharp';
}
```

- [ ] **Step 3: Replace the processing block with ordered pipeline**

Inside `handleGenerateImage`, after `const rawPath = result.filePath;`, parse new params:

```ts
  const returnMode = parseReturnMode(args.returnMode);
  const realEsrgan = args.realEsrgan !== undefined ? args.realEsrgan !== false : true;
  const enhanceBackend = parseEnhanceBackend(args.enhanceBackend);
  const enhanceFallback = parseEnhanceFallback(args.enhanceFallback);
  const realEsrganModel = (args.realEsrganModel ? String(args.realEsrganModel) : 'auto') as RealEsrganModel | 'auto';
  const realEsrganScale = parseScale(args.realEsrganScale);
  const realEsrganAutoDownload = args.realEsrganAutoDownload !== undefined ? args.realEsrganAutoDownload !== false : true;
  const realEsrganTimeoutMs = args.realEsrganTimeoutMs ? Number(args.realEsrganTimeoutMs) : 120000;
```

Then change path setup to:

```ts
  const dir = dirname(rawPath);
  const base = basename(rawPath, extname(rawPath));
  let finalPath = rawPath;
  let processedPath: string | null = null;
  let enhancementPath: string | null = null;
  let processingInfo = '';
  let mimeType = result.mimeType;
```

Apply clarity first only when requested/default denoise remains true:

```ts
  const clarityActive = denoise || sharpen || enhanceContrast;
  if (clarityActive) {
    processedPath = join(dir, `${base}_processed.png`);
    finalPath = processedPath;
    mimeType = 'image/png';
    log('Applying clarity pipeline...');
    const clarityRes = await applyClarity(rawPath, processedPath, {
      denoise,
      denoiseMethod,
      denoiseRadius,
      sharpen,
      enhanceContrast,
    });
    processingInfo += `\nClarity: ${clarityRes.steps.join(' + ') || 'none'}${clarityRes.denoiseFallback ? ' (neural fallback to median)' : ''}`;
  }
```

Apply enhancement after clarity:

```ts
  if (realEsrgan && enhanceBackend !== 'none') {
    enhancementPath = join(dir, `${base}_enhanced.png`);
    const enhancement = await enhanceGeneratedImage({
      inputPath: finalPath,
      outputPath: enhancementPath,
      enabled: true,
      backend: enhanceBackend,
      fallback: enhanceFallback,
      model: realEsrganModel,
      scale: realEsrganScale,
      autoDownload: realEsrganAutoDownload,
      timeoutMs: realEsrganTimeoutMs,
    });
    finalPath = enhancement.outputPath;
    mimeType = 'image/png';
    processingInfo += `\nEnhancement: ${enhancement.message}`;
    if (enhancement.binaryPath) {
      processingInfo += `\nReal-ESRGAN binary: ${enhancement.binaryPath}`;
    }
  }
```

Apply background removal after enhancement:

```ts
  if (removeBackground) {
    const bgOutputPath = finalPath.replace(/\.png$/i, '_nobg.png');
    log('Removing background...');
    const bgRes = await removeBackgroundImage({ inputPath: finalPath, outputPath: bgOutputPath });
    finalPath = bgRes.outputPath;
    mimeType = 'image/png';
    processingInfo += `\nBackground removed: ${bgRes.modelUsed}`;
  }
```

Apply compression last:

```ts
  if (args.compress !== false && finalPath.endsWith('.png')) {
    const compressResult = await compressImage(finalPath);
    if (compressResult.compressed) {
      processingInfo += `\nCompression: ${formatBytes(compressResult.originalSize)} -> ${formatBytes(compressResult.compressedSize)}`;
    } else {
      processingInfo += `\nCompression: skipped (${formatBytes(compressResult.originalSize)})`;
    }
  }
```

Build content according to return mode:

```ts
  const content: Array<{ type: string; data?: string; mimeType?: string; text: string }> = [];
  if (returnMode === 'binary' || returnMode === 'both') {
    content.push({ type: 'image', data: readFileSync(finalPath).toString('base64'), mimeType, text: '' });
  }

  let text = `Generated image from prompt: "${generationPrompt}"`;
  if (optimizedFrom) {
    text += `\n\nOptimized from original: "${optimizedFrom}"`;
  }
  text += `\n\nImage metadata: ${JSON.stringify(result.metadata, null, 2)}`;
  text += `\n\nRaw image saved to: ${rawPath}`;
  if (processedPath) text += `\nProcessed image saved to: ${processedPath}`;
  if (enhancementPath) text += `\nEnhanced image saved to: ${enhancementPath}`;
  text += `\nFinal image saved to: ${finalPath}`;
  text += processingInfo;

  if (returnMode === 'path' || returnMode === 'both') {
    content.push({ type: 'text', text });
  } else {
    content.push({ type: 'text', text: `Final image saved to: ${finalPath}${processingInfo}` });
  }
```

- [ ] **Step 4: Run build and tests**

Run: `npm run build && npm test`

Expected: PASS for all tests.

---

### Task 6: Keep EnhanceImage Standalone Compatible

**Files:**
- Modify only if needed: `src/tools/enhanceImage.ts`
- Test: `tests/realesrgan.test.js`

**Interfaces:**
- `handleEnhanceImage(args)` should continue returning image binary plus text, as before.

- [ ] **Step 1: Run existing enhanceImage tests**

Run: `npm run build && npm test`

Expected: PASS. If it fails due to changed exports or service behavior, continue.

- [ ] **Step 2: Fix imports only if TypeScript requires it**

If TypeScript fails because `ensureRealEsrgan` was exported or names changed, keep `handleEnhanceImage` unchanged except import compatibility.

- [ ] **Step 3: Add no new behavior to standalone tool**

Do not change `enhanceImage` return mode in this task. Its existing binary output behavior remains the standalone tool behavior.

- [ ] **Step 4: Run tests**

Run: `npm run build && npm test`

Expected: PASS for all tests.

---

### Task 7: Documentation and Agent Instructions

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `docs/reference/tools.md`
- Modify: `docs/reference/env-vars.md`
- Modify: `docs/architecture/overview.md`
- Modify: `docs/architecture/tool-design.md`
- Modify: `docs/guides/installation.md`

**Interfaces:**
- Documentation must say `generateImage` defaults to path response and default enhancement with Real-ESRGAN auto + sharp fallback.
- Documentation must say `sharpen` and `enhanceContrast` remain default off.

- [ ] **Step 1: Update README feature summary**

In `README.md`, change the `generateImage` feature text to include:

```md
- **文生图 + 默认增强** — Pollinations 免费 API 生成后默认做增强：优先 Real-ESRGAN ncnn-vulkan，环境不支持时用 sharp CPU resize 兜底；默认返回本地路径，可通过 `returnMode` 返回二进制
```

- [ ] **Step 2: Update tools reference**

In `docs/reference/tools.md`, add the new parameters to `generateImage`:

```md
| `realEsrgan` | boolean | — | `true` | 默认对生成图做增强 |
| `enhanceBackend` | enum | — | `auto` | `auto`/`realesrgan`/`sharp`/`none` |
| `enhanceFallback` | enum | — | `sharp` | Real-ESRGAN 不可用时默认 sharp CPU 兜底 |
| `realEsrganModel` | enum | — | `auto` | Real-ESRGAN 模型；auto 按 prompt 选择，显式模型值优先 |
| `realEsrganScale` | enum | — | `2` | 增强倍率 `2`/`3`/`4` |
| `realEsrganAutoDownload` | boolean | — | `true` | 支持平台下自动下载 Real-ESRGAN 二进制 |
| `realEsrganTimeoutMs` | number | — | `120000` | Real-ESRGAN 超时 |
| `returnMode` | enum | — | `path` | `path`=只返回本地路径；`binary`=返回图片二进制；`both`=两者都返回 |
```

- [ ] **Step 3: Update architecture docs**

In `docs/architecture/overview.md` and `docs/architecture/tool-design.md`, update the generateImage flow to:

```md
generate raw → clarity (denoise default, sharpen/CLAHE off) → enhancement (Real-ESRGAN auto, sharp fallback) → optional removeBackground → compress → return path/binary based on returnMode
```

- [ ] **Step 4: Update installation guidance**

In `docs/guides/installation.md`, add an environment preflight section:

```md
`generateImage` 默认会尝试 Real-ESRGAN。首次使用时会检查当前平台与缓存：支持平台且缓存/`REALESRGAN_PATH` 可用时直接使用；支持平台但未安装且 `realEsrganAutoDownload=true` 时自动下载；不可用或运行失败时默认使用 sharp CPU fallback。
```

- [ ] **Step 5: Update AGENTS.md gotchas**

In `AGENTS.md`, update the Real-ESRGAN and generateImage sections so future agents know:

```md
- `generateImage` default return mode is `path`; pass `returnMode: 'binary'` or `'both'` for image content.
- `generateImage` default enhancement is `enhanceBackend='auto'`: Real-ESRGAN first, sharp CPU fallback.
- `enhanceImage` remains standalone for existing local images.
```

- [ ] **Step 6: Verify docs do not contain stale defaults**

Run:

```bash
rg "default denoise|returns base64|返回 base64|enhanceImage.*off the generateImage path|generateImage.*不.*Real-ESRGAN" README.md AGENTS.md docs
```

Expected: Any matches should be manually reviewed and corrected if they contradict the new behavior.

---

### Task 8: Final Verification

**Files:**
- No code changes unless verification reveals issues.

**Interfaces:**
- Build and test suite are the completion evidence.

- [ ] **Step 1: Run full build**

Run: `npm run build`

Expected: TypeScript exits 0.

- [ ] **Step 2: Run full test suite**

Run: `npm test`

Expected: all tests pass, including new fallback and generation enhancement tests.

- [ ] **Step 3: Optional manual smoke test without forcing Real-ESRGAN**

Run the MCP server or call the handler through an existing test harness with `enhanceBackend='sharp'`, `returnMode='path'`, and a tiny prompt.

Expected: response text includes raw path and final image path; no image binary content when `returnMode='path'`.

- [ ] **Step 4: Record final behavior in completion response**

Report:

```md
- Build: `npm run build` passed.
- Tests: `npm test` passed with N tests.
- `generateImage` default: Real-ESRGAN auto + sharp fallback, compress on, returnMode path.
- `enhanceImage`: standalone existing-image enhancement remains available.
```

---

## Self-Review

**Spec coverage:** The plan covers environment probing, automatic Real-ESRGAN download/use when available, sharp CPU fallback when unsupported, default `generateImage` enhancement, optional background removal after enhancement, default compression, output mode path/binary/both, and docs updates.

**Placeholder scan:** No `TBD`, `TODO`, or unspecified test steps remain. Each task has concrete files, interfaces, commands, and expected results.

**Type consistency:** `EnhancementBackend`, `EnhancementFallback`, `RealEsrganModel`, `returnMode`, and schema property names are consistent across tasks.
