import type { ToolSchema } from '../types/schemas.js';

export const generateImageSchema: ToolSchema = {
  name: 'generateImage',
  description: `Purpose
--------
Generate an image from a text prompt using Pollinations free tier. Performs raw generation, then enhances with Real-ESRGAN when available, uses sharp CPU fallback when configured, applies optional background removal, runs PNG compression, and returns paths unless returnMode requests binary output.

Default behavior: raw generation followed by Real-ESRGAN enhancement when available, sharp CPU fallback, denoise OFF, PNG compression ON, and path-only response. realEsrgan=false disables generated-image enhancement regardless of enhanceBackend. enhanceBackend='none' also disables generated-image enhancement. enhanceBackend='auto' tries Real-ESRGAN first, then uses enhanceFallback. enhanceFallback='sharp' uses CPU sharp fallback. enhanceFallback='none' returns or propagates the Real-ESRGAN error. enhanceBackend='realesrgan' does not silently fallback. Denoise / sharpen / contrast / background-removal are OFF unless requested or auto-triggered.

Use When
--------
Use this tool when the user:
- explicitly asks to create, generate, draw, or make a picture/image/photo/illustration/artwork from text
- says "生成图片" / "画一张" / "生成一张图" / "make an image"
- wants a visual result they can view or save locally
- needs denoise / sharpen / background removal applied to the generated image

Do Not Use
--------
Do not use for:
- getting only a URL/link without downloading (use generateImageUrl instead)
- optimizing a prompt without generating (use optimizePrompt instead)
- generating text or answering questions (use respondText instead)

Input
--------
prompt: string — Text description of the image. Can be long/complex; auto-optimized by default.
model: string (optional) — Image model (default: qwen-image). Use listImageModels for options.
seed: number (optional) — Reproducibility seed. Different seeds = different images.
width/height: number (optional) — Requested dimensions (default: 1024). Free tier downsamples to 768px max.
autoOptimize: boolean (optional, default: true) — Auto-compress prompt for free-tier quality.
optimizeStyle: enum (optional, default: auto) — auto|realistic|anime|painting|scifi|portrait.
enhance: boolean (optional, default: false) — Pollinations LLM enhance. Keep false (harmful on free tier).
safe: boolean (optional, default: false) — Content filtering.
noTextConstraint: boolean (optional, default: true) — Append a no-text/no-logo/no-watermark constraint. Keep true for portraits/assets; set false for posters, UI screenshots, or when the constraint conflicts with screen/code prompts.

Post-processing (applied after generation; raw image always kept):
denoise: boolean (optional, default: false) — Apply denoise. OFF by default; enable explicitly for noisy generated images.
denoiseMethod: enum (optional, default: median) — median (sharp, fast, zero-dep) | neural (ONNX, high quality, slow; requires DENOISE_MODEL_PATH env, else auto-falls back to median).
denoiseRadius: number (optional, default: 1) — Median filter radius. 1=3x3 mild, 2=stronger but softer. Median only.
realEsrgan: boolean (optional, default: true) — Enable generated-image enhancement by default. realEsrgan=false disables generated-image enhancement regardless of enhanceBackend.
enhanceBackend: enum (optional, default: auto) — auto|realesrgan|sharp|none. enhanceBackend='none' also disables generated-image enhancement; enhanceBackend='auto' tries Real-ESRGAN first, then uses enhanceFallback; enhanceBackend='realesrgan' does not silently fallback.
enhanceFallback: enum (optional, default: sharp) — sharp|none. Applies only to enhanceBackend='auto' when Real-ESRGAN fails or is unavailable: enhanceFallback='sharp' uses CPU sharp fallback; enhanceFallback='none' returns or propagates the Real-ESRGAN error.
realEsrganModel: enum (optional, default: auto) — auto|realesrgan-x4plus|realesrgan-x4plus-anime|realesr-animevideov3. auto selects realesr-animevideov3 for generated-image enhancement by default. Explicit model values override auto selection; use realesrgan-x4plus or realesrgan-x4plus-anime only when explicitly requested.
realEsrganScale: enum (optional, default: 2) — 2|3|4.
realEsrganAutoDownload: boolean (optional, default: true) — Download Real-ESRGAN binary when missing.
realEsrganTimeoutMs: number (optional, default: 120000) — Real-ESRGAN process timeout.
sharpen: boolean (optional, default: false) — unsharp mask sharpening.
enhanceContrast: boolean (optional, default: false) — CLAHE local contrast enhancement.
removeBackground: boolean (optional, default: false) — Optional background removal via ONNX or background-color analysis -> transparent PNG. Auto-enabled for asset prompts such as asset/icon/sprite/item/weapon/sword/shield/inventory/素材/图标/道具/武器/装备 keywords (explicit value always wins).
removeBackgroundStrategy: enum (optional, default: auto) — auto|default|preserve-light-subject|clean-edge. auto samples image edges to pick a safer background removal path: light/white backgrounds preserve light subjects; saturated solid backgrounds use color edge cleanup; uncertain backgrounds use default AI removal.

Prompt quality tip: generated images are more reliable when the prompt has one clear subject, one composition, and one visual mood. Asset/icon/item/sprite/weapon/equipment prompts automatically add complete-object and sharp-edge generation constraints such as fully visible, uncropped, clean silhouette, sharp outline, and well-defined edges. Weapon and sword prompts add single-subject constraints to reduce duplicate weapons, crossed weapons, extra blades, and extra handles. Organic and plant prompts add seamless natural-shape constraints to reduce seams, ring bands, belts, mechanical joints, and segmented stems. For developer/workstation scenes, prefer "blurred screens" and "abstract UI shapes" over detailed code or many monitor elements. For transparent assets, prompt a plain white background and use removeBackground=true; avoid asking the image model for transparent background when quality matters.

Output control:
compress: boolean (optional, default: true) — Compress PNG with pngquant+zopfli.
outputPath: string (optional) — Save directory (default: ./vision-output).
fileName: string (optional) — File name without extension.
format: enum (optional, default: png) — png|jpeg|jpg|webp. (Processed variant is always PNG.)
returnMode: enum (optional, default: path) — path|binary|both. Return paths by default; include binary only when requested.

Output
--------
content: [text (metadata + rawPath + processedPath + enhancement info)] by default. Set returnMode to binary for image content plus minimal final path text, or both for image content plus full path/metadata text.

With defaults, files include the raw generated image (<fileName>.<format>) and an enhanced final PNG (<fileName>_enhanced.png). A clarity processed PNG (<fileName>_processed.png) is produced only when denoise, sharpen, or enhanceContrast is enabled. If background removal is enabled, it runs after enhancement and the final file is a transparent PNG derived from the enhanced output. By default the response returns local paths. Set returnMode to binary or both to include base64 for the final image.

Limitations
--------
- Pollinations raw output is downsampled to 768px max regardless of requested width/height. Real-ESRGAN or sharp enhancement may upscale the saved output after generation.
- Same prompt + same seed ignores the model parameter; change seed when switching models.
- Neural denoise (denoiseMethod=neural) needs a DnCNN-style ONNX model at DENOISE_MODEL_PATH; without it, silently falls back to median.
- Background removal first run downloads ~170MB ONNX model (cached thereafter); takes 10-30s.

Examples
--------
User: "Generate a picture of a sunset over mountains"
→ Use this tool (defaults save raw and enhanced final PNG paths).

User: "画一只可爱的猫，锐化一下"
→ Use this tool. (pass sharpen=true)

User: "生成一个游戏道具图标"
→ Use this tool. (removeBackground auto-enabled by keyword → transparent final PNG after enhancement)

User: "Give me just the URL for an image of a cat"
→ Do NOT use. Use generateImageUrl instead.`,
  inputSchema: {
    type: 'object',
    properties: {
      prompt: { type: 'string', description: 'Text description of image. Can be long/complex — will be auto-optimized by default.' },
      model: { type: 'string', default: 'qwen-image', description: 'Image model. Default: qwen-image. Use listImageModels for options.' },
      seed: { type: 'number', description: 'Seed for reproducibility. Different seeds = different images.' },
      width: { type: 'number', default: 1024, description: 'Requested width. Free tier downsamples to 768px max.' },
      height: { type: 'number', default: 1024, description: 'Requested height. Free tier downsamples to 768px max.' },
      autoOptimize: { type: 'boolean', default: true, description: 'Auto-optimize prompt for free-tier quality. Set false to use prompt as-is.' },
      optimizeStyle: { type: 'string', default: 'auto', enum: ['auto', 'realistic', 'anime', 'painting', 'scifi', 'portrait'], description: 'Prompt optimization style preset.' },
      enhance: { type: 'boolean', default: false, description: 'Pollinations enhance (LLM rewrites prompt). NOT recommended for free tier. Keep false.' },
      safe: { type: 'boolean', default: false, description: 'Content filtering. Default off.' },
      noTextConstraint: { type: 'boolean', default: true, description: 'Append the default no-text/no-logo/no-watermark prompt constraint. Keep true for most portraits/assets; set false for posters, UI screenshots, or when screen/code prompts need fewer constraints.' },
      denoise: { type: 'boolean', default: false, description: 'Apply denoise. OFF by default; enable explicitly for noisy generated images.' },
      denoiseMethod: { type: 'string', default: 'median', enum: ['median', 'neural'], description: 'median=sharp fast zero-dep; neural=ONNX high-quality (needs DENOISE_MODEL_PATH, else falls back to median).' },
      denoiseRadius: { type: 'number', default: 1, description: 'Median filter radius. 1=mild, 2=stronger but softer. Median method only.' },
      realEsrgan: { type: 'boolean', default: true, description: 'Enable generated-image enhancement by default. realEsrgan=false disables generated-image enhancement regardless of enhanceBackend.' },
      enhanceBackend: { type: 'string', default: 'auto', enum: ['auto', 'realesrgan', 'sharp', 'none'], description: "Enhancement backend. enhanceBackend='none' also disables generated-image enhancement; enhanceBackend='auto' tries Real-ESRGAN first, then uses enhanceFallback; enhanceBackend='realesrgan' does not silently fallback." },
      enhanceFallback: { type: 'string', default: 'sharp', enum: ['sharp', 'none'], description: "Fallback for enhanceBackend='auto' only. enhanceFallback='sharp' uses CPU sharp fallback; enhanceFallback='none' returns or propagates the Real-ESRGAN error." },
      realEsrganModel: { type: 'string', default: 'auto', enum: ['auto', 'realesrgan-x4plus', 'realesrgan-x4plus-anime', 'realesr-animevideov3'], description: 'Real-ESRGAN model for generated-image enhancement. auto selects realesr-animevideov3 by default. Explicit model values override auto selection; use realesrgan-x4plus or realesrgan-x4plus-anime only when explicitly requested.' },
      realEsrganScale: { type: 'number', default: 2, enum: [2, 3, 4], description: 'Real-ESRGAN upscale factor.' },
      realEsrganAutoDownload: { type: 'boolean', default: true, description: 'Download Real-ESRGAN binary when missing.' },
      realEsrganTimeoutMs: { type: 'number', default: 120000, description: 'Real-ESRGAN process timeout in milliseconds.' },
      sharpen: { type: 'boolean', default: false, description: 'unsharp mask sharpening.' },
      enhanceContrast: { type: 'boolean', default: false, description: 'CLAHE local contrast enhancement.' },
      removeBackground: { type: 'boolean', default: false, description: 'Background removal -> transparent PNG. Auto-on for asset/icon/item/weapon keywords; explicit value wins.' },
      removeBackgroundStrategy: { type: 'string', default: 'auto', enum: ['auto', 'default', 'preserve-light-subject', 'clean-edge'], description: 'Background-removal strategy. auto samples image edge colors: light backgrounds use preserve-light-subject to avoid deleting white subject areas, saturated solid backgrounds use clean-edge color cleanup, uncertain backgrounds use default AI removal. Explicit values override auto.' },
      compress: { type: 'boolean', default: true, description: 'Compress PNG with pngquant+zopfli. PNG only; other formats skip compression.' },
      outputPath: { type: 'string', default: './vision-output', description: 'Directory to save image.' },
      fileName: { type: 'string', description: 'File name without extension. Default: generated from prompt.' },
      format: { type: 'string', default: 'png', enum: ['png', 'jpeg', 'jpg', 'webp'] },
      returnMode: { type: 'string', default: 'path', enum: ['path', 'binary', 'both'], description: 'Return paths by default; include binary only when requested.' },
    },
    required: ['prompt'],
  },
};

export const generateImageUrlSchema: ToolSchema = {
  name: 'generateImageUrl',
  description: `Purpose
--------
Generate a shareable Pollinations image URL from a text prompt without downloading or saving to disk.

Use When
--------
Use this tool when the user:
- wants only a URL/link to an image (no download, no file save)
- needs an image URL for embedding in web pages, docs, or markdown
- says "给我一个链接" / "give me a URL" / "embed an image"
- wants a lightweight, fast response without base64 overhead

Do Not Use
--------
Do not use for:
- generating and saving an image to disk (use generateImage instead)
- optimizing a prompt without generating (use optimizePrompt instead)
- post-processing (denoise/sharpen/background removal) — those require a local file, only available via generateImage

Input
--------
prompt: string — Text description of the image.
model: string (optional) — Image model (default: qwen-image).
seed: number (optional) — Reproducibility seed.
width/height: number (optional) — Requested dimensions (default: 1024). Free tier downsamples to 768px.
autoOptimize: boolean (optional, default: true) — Auto-optimize prompt.
optimizeStyle: enum (optional, default: auto) — auto|realistic|anime|painting|scifi|portrait.
enhance: boolean (optional, default: false) — Keep false for free tier.
safe: boolean (optional, default: false) — Content filtering.
noTextConstraint: boolean (optional, default: true) — Append a no-text/no-logo/no-watermark constraint. Set false when text/UI content is intentional.

Output
--------
content: [text (image URL + metadata)]

Limitations
--------
- URL points to Pollinations CDN; availability may drift over time.
- Same 768px free-tier limit applies.
- No post-processing (no denoise/sharpen/background removal) — use generateImage for that.

Examples
--------
User: "Give me a URL for an image of a cat"
→ Use this tool.

User: "Embed an image of a sunset in my README"
→ Use this tool.

User: "Generate and save a picture of a dog to my desktop"
→ Do NOT use. Use generateImage instead.

User: "What is 2+2?"
→ Do NOT use. Use respondText instead.`,
  inputSchema: {
    type: 'object',
    properties: {
      prompt: { type: 'string', description: 'Text description of image.' },
      model: { type: 'string', default: 'qwen-image', description: 'Image model. Default: qwen-image.' },
      seed: { type: 'number', description: 'Seed for reproducibility. Different seeds = different images.' },
      width: { type: 'number', default: 1024, description: 'Requested width. Free tier downsamples to 768px max.' },
      height: { type: 'number', default: 1024, description: 'Requested height. Free tier downsamples to 768px max.' },
      autoOptimize: { type: 'boolean', default: true, description: 'Auto-optimize prompt.' },
      optimizeStyle: { type: 'string', default: 'auto', enum: ['auto', 'realistic', 'anime', 'painting', 'scifi', 'portrait'], description: 'Optimization style preset.' },
      enhance: { type: 'boolean', default: false, description: 'Pollinations enhance. Keep false for free tier.' },
      safe: { type: 'boolean', default: false, description: 'Content filtering. Default off.' },
      noTextConstraint: { type: 'boolean', default: true, description: 'Append the default no-text/no-logo/no-watermark prompt constraint. Set false when text/UI content is intentional.' },
    },
    required: ['prompt'],
  },
};
