# AGENTS.md

TypeScript MCP server wrapping Pollinations free-tier image/text APIs + sharp/ONNX image post-processing + optional Real-ESRGAN enhancement. Stdio transport. No API keys; `generateImage` can auto-download Real-ESRGAN on supported platforms and falls back to sharp CPU enhancement when unavailable.

## Commands

```bash
npm run build      # tsc → dist/ (only verification available; no separate lint/typecheck)
npm run start      # node dist/index.js  (must build first — MCP client loads dist/, not src/)
npm run dev        # tsc --watch
npm test           # node --test  — unit tests; run npm run build first (tests import dist/)
```

There is no lint, separate typecheck, or codegen step. `npm run build` is the compiler check. The MCP client (`~/.config/opencode/opencode.json`) points at `dist/index.js`, so **rebuild after every edit before testing via the client or running tests**.

Before every git commit, bump the npm package version in `package.json` and `package-lock.json`. Use `npm version <new-version> --no-git-tag-version` so the version change is included in the same commit.

## Real-ESRGAN and generated-image enhancement

`generateImage` defaults to generated-image enhancement with `enhanceBackend='auto'`: try Real-ESRGAN ncnn-vulkan first, auto-download the current-platform portable package on supported environments when missing, and fall back to sharp CPU resize if Real-ESRGAN/Vulkan is unsupported or fails. `realEsrganModel` defaults to `auto`, which selects `realesr-animevideov3` for generated-image enhancement. Explicit model overrides always win. When Real-ESRGAN is unavailable, availability is re-probed after `REALESRGAN_RECHECK_MS` (default 300000) so a late-loading Vulkan driver can recover.

Prompt quality: keep generated-image prompts focused. Prefer one subject, one composition, and one visual mood. Asset/icon/item/sprite/weapon/equipment prompts automatically append complete-object and sharp-edge constraints (`fully visible`, `uncropped`, `clean silhouette`, `sharp outline`, `well-defined edges`) before generation. For developer/workstation scenes, use blurred screens and abstract UI shapes instead of many monitors, detailed code, and many desk props. For transparent assets, prompt a plain white background and use `removeBackground=true`; avoid asking the image model for `transparent background` when quality matters. `noTextConstraint` defaults to true and appends no-text/no-logo/no-watermark guidance; set it to false only when posters, UI screenshots, labels, or text-like content are intentional or when the constraint conflicts with screen/code prompts.

## The 4 tools

| # | Tool | Purpose |
|---|---|---|
| 1 | `generateImage` | Text-to-image, save raw + clarity `_processed.png` + enhanced/final PNG, default path response; pass `returnMode: 'binary'` or `'both'` for image content |
| 2 | `generateImageUrl` | Shareable URL only (no download, no post-processing) |
| 3 | `listImageModels` | Hardcoded image model registry |
| 4 | `listTextModels` | Hardcoded text model registry |

`removeBackground` and `convertImage` are **no longer standalone tools** — their capabilities are `generateImage` parameters. `enhanceImage`, `optimizePrompt`, and `respondText` standalone tools have been removed due to free-tier API unavailability (402) and redundancy with `generateImage`'s built-in `autoOptimize` and enhancement pipeline.

## generateImage post-processing (the key design)

After generating + saving the raw image, `generateImage` applies a local pipeline and returns local paths by default (raw is always kept):

```
generate → save raw → optional clarity (denoise/sharpen/CLAHE off by default) → enhancement (Real-ESRGAN auto, sharp fallback) → optional removeBackground → compress → return path/binary based on returnMode
```

Order rationale: clarity and enhancement run on the opaque image first; background removal runs after enhancement so sharp/Real-ESRGAN never touch the final alpha channel.

**Params & defaults:**
- `denoise` (default **false**) — opt in for noisy generated images. `denoiseMethod`: `median` (default, sharp, fast, zero-dep) | `neural` (ONNX, high quality, slow; needs `DENOISE_MODEL_PATH`, else auto-falls back to median). `denoiseRadius` (default 1, median only).
- `sharpen` (default **false**) — unsharp mask.
- `enhanceContrast` (default **false**) — CLAHE.
- `realEsrgan` (default **true**) / `enhanceBackend` (default **`auto`**) — generated-image enhancement. `auto` tries Real-ESRGAN first and uses sharp CPU fallback by default.
- `realEsrganModel` (default **`auto`**) — generated-image Real-ESRGAN model selection. `auto` selects `realesr-animevideov3` by default. Explicit `realEsrganModel` values override the mapping; use `realesrgan-x4plus` or `realesrgan-x4plus-anime` only when specifically requested.
- `enhanceFallback` (default **`sharp`**) — fallback when Real-ESRGAN is unavailable or fails. Use `none` to make failures surface.
- `returnMode` (default **`path`**) — pass `binary` or `both` when MCP image content is needed.
- `noTextConstraint` (default **true**) — appends no-text/no-logo/no-watermark guidance. Keep true for most portraits/assets; set false for intentional text/UI or when reducing prompt conflicts matters more than avoiding text artifacts.
- `removeBackground` (default **false**) — ONNX via `@imgly/background-removal-node`. **Auto-enabled** when prompt contains asset/icon/sprite/item/weapon/sword/shield/inventory/素材/图标/道具/武器/装备 style keywords; English terms use token matching to avoid substring false positives. An explicit `removeBackground` value always wins.
- `compress` (default **true**) — pngquant+zopfli (PNG only).

With defaults, every call produces `<fileName>.<format>` (raw) and an enhanced final PNG path. `<fileName>_processed.png` is produced only when clarity options are enabled (`denoise`, `sharpen`, or `enhanceContrast`). If background removal runs, the final path may be an enhanced `_nobg.png`. The default response is text with paths and metadata; pass `returnMode: 'binary'` or `'both'` for image content.

## Architecture quick map

- `src/index.ts` → `src/server.ts` — entrypoint; MCP Server, 4 tools + 1 prompt registered via `setRequestHandler`; server version read from package.json at runtime
- `src/schemas/` — `imageSchemas` (generateImage/generateImageUrl), `textSchemas` (listImageModels/listTextModels)
- `src/tools/` — 2 handler files. `generateImage.ts` (generateImage + generateImageUrl; thin orchestration only), `textTools.ts` (listImageModels + listTextModels)
- `src/services/`:
  - `pipeline/` — `promptBuilder` (buildGenerationPrompt: optimize + asset + noText constraints, shared by both handlers), `postProcessor` (runPostProcessing: clarity → enhancement → background removal → compress, with partial-failure handling)
  - `pollinations/` — image/text API + client with retry
  - `enhance/` — `clarityService` (median/neural denoise + CLAHE + sharpen pipeline), `denoiseService` (ONNX neural denoise, falls back to median), `backgroundRemovalService` (@imgly ONNX), `compressService` (pngquant/zopfli)
  - `upscale/` — `realesrganService` (probe/auto-download/cache platform package + spawn Real-ESRGAN ncnn-vulkan), `fallbackUpscaleService` (sharp CPU resize), `generationEnhancementService` (generateImage enhancement orchestration), `modelSelectionService` (auto Real-ESRGAN model selection)
  - `optimizer/` — promptOptimizer LLM compression + stylePresets
- `src/config/` — `constants.ts` (env→defaults), `assetKeywords.ts` (asset/weapon/organic keyword arrays + constraint builders + model selection), `models.ts` (hardcoded model registry — do NOT replace with live fetch)
- `src/utils/` — file I/O, `logger.ts`, `pathUtils.ts`, `validate.ts` (clamp + sanitizeFileName) (note: `imageUtils.ts` was removed — sharp helpers now live in services)

## Gotchas that cost real time

- **Stdio transport**: `logger.ts` writes to **stderr only**. Never `console.log` to stdout — it corrupts the MCP JSON-RPC stream. New logs go through `info()`, `warn()`, or `error()`. `info/warn/error` are always visible; `log()` is debug-only (requires `DEBUG=true`).
- **MCP SDK import paths** use `.js` even in TS (ESM): `@modelcontextprotocol/sdk/server/stdio.js` — not `/stdio.js`, not `.ts`.
- **sharp 0.33**: `clahe` / `median` / `sharpen` used by `clarityService`. `gamma` is clamped 1.0–3.0 and >1 *darkens*; use `modulate({ brightness })` for bidirectional brightness control.
- **`@imgly/background-removal-node`** downloads a ~170MB ONNX model on first `removeBackground` run (cached under `node_modules/@imgly/...`). First call ~10-30s. Now triggered via `generateImage`'s `removeBackground` param (or auto keyword).
- **Neural denoise (`denoiseMethod: 'neural'`)** requires a DnCNN-style ONNX model at `DENOISE_MODEL_PATH` env. Without it, `clarityService` silently falls back to median (sets `denoiseFallback: true`). No model is bundled — users opt in by providing a model.
- **`compressImage`** (pngquant+zopfli) is shared by `generateImage`. Skipped for non-PNG. Requires `imagemin-pngquant` / `imagemin-zopfli` native deps — if install fails, set `compress: false`.
- **Real-ESRGAN (`generateImage`)**: reads optional `REALESRGAN_PATH` to use an existing binary; otherwise auto-download can fetch the current platform package. `REALESRGAN_CACHE_DIR` overrides cache location. Requires Vulkan-capable GPU/driver; Windows integrated GPUs work only with proper Intel/AMD Vulkan drivers. `generateImage` defaults to sharp CPU fallback if Real-ESRGAN is unsupported or fails. Downloads retry twice with exponential backoff and a 120s timeout.
- **Env defaults live in `src/config/constants.ts`**. Reads `IMAGE_AUTO_OPTIMIZE`, `IMAGE_OPTIMIZE_STYLE`, `IMAGE_ENHANCE`, `IMAGE_SAFE`, `TEXT_MODEL`, `TEXT_TEMPERATURE`, `TEXT_TOP_P`, `OUTPUT_DIR`, `IMAGE_MODEL`/`IMAGE_WIDTH`/`IMAGE_HEIGHT`, `DEBUG`. `DENOISE_MODEL_PATH` is read directly in `denoiseService.ts` (optional). `REALESRGAN_RECHECK_MS` (default 300000) controls the Real-ESRGAN availability re-probe interval in `generationEnhancementService.ts`; `BG_REMOVAL_TIMEOUT_MS` (default 300000) bounds the ONNX background-removal call. There are NO `ENHANCE_DEFAULT_*` or `TEXT_SYSTEM` env vars.

## Pollinations free-tier hard limits (validated empirically)

- Pollinations output is **downsampled to 768px max** regardless of requested width/height. `generateImage` then applies local enhancement by default, so final saved output may be upscaled by Real-ESRGAN or sharp fallback.
- **Same prompt + same seed ignores the `model` parameter** — change the seed when switching models.
- `enhance` query param is harmful on free tier → `IMAGE_ENHANCE=false` default.
- Model availability drifts; the verified set lives in `src/config/models.ts`. nanobanana/seedream/kontext return 500.
- `listImageModels` / `listTextModels` return the hardcoded registry, NOT a live API call.
- `fetchWithAuth` in `client.ts` retries 429/500/502/503/520-524 with exponential backoff (2s→4s→8s, max 30s, 3 retries).

## Prompt optimization (the only "presets" left)

`optimizeStyle` (auto/realistic/anime/painting/scifi/portrait) controls LLM prompt compression strategy in `generateImage`'s `autoOptimize` (via `buildGenerationPrompt` in `promptBuilder`). These are prompt-compression styles, NOT image post-processing presets. Image post-processing uses explicit `generateImage` flags (`denoise`/`sharpen`/`enhanceContrast`/`removeBackground`).
