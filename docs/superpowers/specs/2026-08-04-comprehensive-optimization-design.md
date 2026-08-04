# Comprehensive Optimization Design

**Date**: 2026-08-04
**Status**: ✅ Completed (all 4 phases committed, v0.1.3 → v0.2.3)
**Approach**: Phased bottom-up (P0-P4), each phase independently buildable/testable/committable.

## Phase 1: P0 Bug + P1 Robustness

### P0 Fixes

**#1 Version sync** — `server.ts` reads `package.json` version via `createRequire` at runtime; add test asserting equality.

**#2 Image content-type validation** — `imageService.ts` checks buffer magic bytes (PNG/JPEG/WebP/GIF) after fetch; non-image throws with first 200 chars of body, no corrupt file written.

**#3 Real-ESRGAN availability cache TTL** — `generationEnhancementService.ts` cache becomes `{ value, checkedAt }`; `false` re-probes after TTL (default 5 min, env `REALESRGAN_RECHECK_MS`); `true` trusted, runtime failure sets `false`+timestamp.

**#4 Partial failure context** — `generateImage.ts` wraps post-processing in try/catch; on failure returns `isError: true` with raw path + succeeded steps + failed step error.

### P1 Fixes

**#5 Real-ESRGAN download retry+timeout** — `realesrganService.ts downloadFile` gets AbortController (120s) + 2 retries exponential backoff.

**#6 Background removal timeout** — `backgroundRemovalService.ts` wraps ONNX `removeBackground` in `Promise.race` timeout (default 5 min, env `BG_REMOVAL_TIMEOUT_MS`).

**#7 Compression failure surfacing** — `compressService.ts` adds `warning?: string` to result; real failures set warning + `warn()` log; handler includes in response text.

**#8 Path/numeric validation** — `generateImage.ts`: `fileName` via `path.basename()` (no traversal); `width`/`height` clamp [64,2048]; `denoiseRadius` clamp [1,3]; `realEsrganTimeoutMs` clamp [10000,600000].

### Files touched
`server.ts`, `imageService.ts`, `generationEnhancementService.ts`, `generateImage.ts`, `realesrganService.ts`, `backgroundRemovalService.ts`, `compressService.ts`, + new test files.

## Phase 2: P2 Architecture Refactor

**#9 God function split**:
- New `src/services/pipeline/promptBuilder.ts`: `buildGenerationPrompt(prompt, args)` — handles autoOptimize + asset constraint + noText.
- New `src/services/pipeline/postProcessor.ts`: `runPostProcessing(rawPath, prompt, args)` — clarity + enhancement + bg removal + compress + partial-failure try/catch; moves `parseEnhanceBackend`/`parseEnhanceFallback`/`parseScale`/`parseRemoveBackgroundStrategy` here.
- `generateImage.ts` slimmed to ~120 lines (orchestration only).

**#10 Extract keywords** — New `src/config/assetKeywords.ts`: 8 keyword arrays + constraint constants + match/build functions (`shouldUseAssetPipeline`, `addAssetConstraint`, `selectImageModel`, etc.).

**#11 Dedup** — Both handlers reuse `buildGenerationPrompt`.

**#12 Remove stale types** — Delete `src/types/tools.ts` (unused `GenerateImageParams`/`RespondTextParams`).

**#13 Remove dead code** — Delete `src/config/defaults.ts` (`getDefaults()` unused).

**#14** — Folded into #12 (removing `RespondTextParams` resolves it).

### Files
New: `assetKeywords.ts`, `pipeline/promptBuilder.ts`, `pipeline/postProcessor.ts`. Delete: `types/tools.ts`, `config/defaults.ts`. Modify: `generateImage.ts`.

## Phase 3: P3 Performance

**#15a analyzeBackgroundStrategy thumbnail** — Resize to 100x100 before border sampling (40KB vs 9MB).

**#15b BFS optimization** — `Int32Array` queue with head/tail pointers; squared distance comparison (no `Math.hypot`); lazy sqrt for soft-alpha only; local variable caching.

**#16 denoiseService conversion loops** — `/255` LUT (HWC->CHW); bitwise trunc + manual clamp (CHW->HWC); local variable caching. Modest gain (neural denoise is opt-in, ONNX inference dominates).

### Files
`backgroundRemovalService.ts`, `denoiseService.ts`, + new/expanded tests.

## Phase 4: P4 Testing + Docs

**#17 Test coverage** — Keep `.js`+`dist/` pattern. New: `promptOptimizer`, `stylePresets`, `client`, `denoiseService`, `versionSync` tests. Expand: `imageService` (magic-bytes), `backgroundRemoval` (strategy+BFS), `compressService` (failure path). Target ~90+ tests.

**#18 `.env.example`** — Document all env vars including Phase 1 additions.

**#19 README + docs sync** — Remove deleted tools (enhanceImage/optimizePrompt/respondText/convertImage/removeBackground standalone); update tool table to 4 current tools; sync `docs/reference/*` and `docs/architecture/*` to Phase 2 structure.

## Verification

Each phase: `npm run build` + `npm test` must pass before commit. Phase 2 is pure refactor — all 57 existing tests must stay green. Phase 3 adds correctness tests proving optimized output equals original output.

## Execution Log

| Phase | Commit | Version | Tests |
|---|---|---|---|
| 1 (P0+P1 bugs/robustness) | `55356c9` | 0.2.0 | 57 → 66 |
| 2 (P2 architecture refactor) | `f307532` | 0.2.1 | 66 → 85 |
| 3 (P3 performance) | `6b8179e` | 0.2.2 | 85 → 90 |
| 4 (P4 testing + docs) | `0262876` | 0.2.3 | 90 → 110 |

All 110 tests pass. End-to-end verified: real `generateImage` call succeeds with Real-ESRGAN enhancement + compression. Working tree clean.
