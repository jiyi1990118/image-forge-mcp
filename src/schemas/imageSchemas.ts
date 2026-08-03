import type { ToolSchema } from '../types/schemas.js';

export const generateImageSchema: ToolSchema = {
  name: 'generateImage',
  description: `⚠️ FREE TIER IMAGE GENERATION — STRICT LIMITATIONS:

1. OUTPUT: 768px max (sharp upscales to 1536px). Do NOT expect high resolution.
2. PROMPT: ONE clear subject, simple composition ONLY. Complex multi-subject, detailed scenes, or fine text WILL FAIL.
3. TEXT: Cannot render readable text, code, logos, or signs. Keep noTextConstraint=true (default).
4. ENHANCE: NEVER set enhance=true — it degrades quality on free tier.
5. ENHANCEMENT (Real-ESRGAN): Requires Vulkan GPU. On macOS the binary fails silently; the tool falls back to sharp CPU upscale (simple resize, not neural enhancement).
6. BACKGROUND REMOVAL: First run downloads ~170MB ONNX model (10-30s). Auto-enabled for asset keywords.
7. PROMPT OPTIMIZATION: Uses a free text API that may be unavailable (returns 402). Falls back to original prompt.

PROMPT RULES (follow these strictly):

- Good: "a red apple on wood table", "a cute cartoon cat", "game icon sword"
- Bad: "a dragon fighting a knight in a castle with fireworks and a crowd watching" (too complex)
- Bad: "a busy street market with many people, stalls, animals, and colorful banners" (too many subjects)
- Bad: "a screenshot of a dashboard with text labels and buttons" (text won't render)

For developer/workstation scenes: use "blurred screens" and "abstract UI shapes" — never detailed code or many monitors.
For transparent assets: prompt "white background" then set removeBackground=true. Do NOT ask the model for "transparent background".
For icons/items/weapons: include asset keywords (icon, asset, weapon, 道具, 图标) to trigger auto-constraints.

Purpose
--------
Generate an image from a text prompt using Pollinations free tier. Raw generation + optional enhancement + optional background removal + PNG compression. Returns local file paths by default.

Use When
--------
- user asks to create/generate/draw/make a picture/image/photo/illustration/artwork from text
- user says "生成图片" / "画一张" / "生成一张图" / "make an image"
- user needs denoise/sharpen/background removal on the generated image

Do Not Use
--------
- getting only a URL (use generateImageUrl)
- general text chat (this is an image tool, not a text model)

Output
--------
By default: raw image + enhanced PNG saved to disk, paths returned as text.
Set returnMode=binary for base64 image content, or returnMode=both for both.

Generated prompt: "prompt" (auto-optimized if >40 words, unless autoOptimize=false).
Files: <name>.<format> (raw) + <name>_enhanced.png (enhanced). <name>_processed.png only when denoise/sharpen/contrast enabled.`,
  inputSchema: {
    type: 'object',
    properties: {
      prompt: { type: 'string', description: 'Text description. One clear subject, simple composition. Complex scenes fail. Auto-optimized if >40 words.' },
      model: { type: 'string', default: 'qwen-image', description: 'Image model. Default: qwen-image. Use listImageModels for options.' },
      seed: { type: 'number', description: 'Reproducibility seed. Different seeds = different images. Same prompt+seed = same output regardless of model.' },
      width: { type: 'number', default: 1024, description: 'Requested width. Free tier downsamples to 768px max. Final output is upscaled by Sharp.' },
      height: { type: 'number', default: 1024, description: 'Requested height. Free tier downsamples to 768px max. Final output is upscaled by Sharp.' },
      autoOptimize: { type: 'boolean', default: true, description: 'Auto-compress prompt for free-tier quality. Free text API may fail (402) → uses original prompt.' },
      optimizeStyle: { type: 'string', default: 'auto', enum: ['auto', 'realistic', 'anime', 'painting', 'scifi', 'portrait'], description: 'Prompt optimization style preset.' },
      enhance: { type: 'boolean', default: false, description: 'Pollinations LLM enhance. HARMFUL on free tier. Keep false.' },
      safe: { type: 'boolean', default: false, description: 'Content filtering. Default off.' },
      noTextConstraint: { type: 'boolean', default: true, description: 'Append no-text/no-logo/no-watermark. Keep true for portraits/assets. Set false only for intentional text/UI.' },
      denoise: { type: 'boolean', default: false, description: 'Apply median denoise. Off by default. Enable for noisy generated images.' },
      denoiseMethod: { type: 'string', default: 'median', enum: ['median', 'neural'], description: 'median=sharp fast; neural=ONNX (needs DENOISE_MODEL_PATH, else falls back to median).' },
      denoiseRadius: { type: 'number', default: 1, description: 'Median filter radius. 1=3x3 mild, 2=stronger. Median only.' },
      realEsrgan: { type: 'boolean', default: true, description: 'Enable generated-image enhancement. realEsrgan=false disables enhancement regardless of enhanceBackend.' },
      enhanceBackend: { type: 'string', default: 'auto', enum: ['auto', 'realesrgan', 'sharp', 'none'], description: "auto=tries Real-ESRGAN first, falls back to sharp. realesrgan=no fallback. sharp=CPU only. none=skip." },
      enhanceFallback: { type: 'string', default: 'sharp', enum: ['sharp', 'none'], description: "Fallback when Real-ESRGAN fails. sharp=CPU resize. none=surface error." },
      realEsrganModel: { type: 'string', default: 'auto', enum: ['auto', 'realesrgan-x4plus', 'realesrgan-x4plus-anime', 'realesr-animevideov3'], description: 'Real-ESRGAN model. auto=realesr-animevideov3. Explicit overrides auto.' },
      realEsrganScale: { type: 'number', default: 2, enum: [2, 3, 4], description: 'Real-ESRGAN upscale factor. 2x default.' },
      realEsrganAutoDownload: { type: 'boolean', default: true, description: 'Download Real-ESRGAN binary (~45MB) when missing.' },
      realEsrganTimeoutMs: { type: 'number', default: 120000, description: 'Real-ESRGAN process timeout. Default 120s.' },
      sharpen: { type: 'boolean', default: false, description: 'Unsharp mask sharpening. Off by default.' },
      enhanceContrast: { type: 'boolean', default: false, description: 'CLAHE local contrast enhancement. Off by default.' },
      removeBackground: { type: 'boolean', default: false, description: 'Background removal → transparent PNG. Auto-on for asset keywords (icon/asset/weapon/道具/图标). First run downloads ~170MB ONNX model (10-30s).' },
      removeBackgroundStrategy: { type: 'string', default: 'auto', enum: ['auto', 'default', 'preserve-light-subject', 'clean-edge'], description: 'Background removal strategy. auto=samples edges to pick best method.' },
      compress: { type: 'boolean', default: true, description: 'PNG compression with pngquant+zopfli. PNG only.' },
      outputPath: { type: 'string', default: './vision-output', description: 'Save directory.' },
      fileName: { type: 'string', description: 'File name without extension. Default: generated from prompt.' },
      format: { type: 'string', default: 'png', enum: ['png', 'jpeg', 'jpg', 'webp'] },
      returnMode: { type: 'string', default: 'path', enum: ['path', 'binary', 'both'], description: 'path=local paths (default). binary=base64 image. both=paths+base64.' },
    },
    required: ['prompt'],
  },
};

export const generateImageUrlSchema: ToolSchema = {
  name: 'generateImageUrl',
  description: `⚠️ FREE TIER — output capped at 768px. ONE clear subject, simple composition only.

Generate a shareable Pollinations image URL from a text prompt without downloading or saving to disk.

Use When:
- user wants only a URL/link to an image (no download, no file save)
- user needs an image URL for embedding in web pages, docs, or markdown
- user says "给我一个链接" / "give me a URL" / "embed an image"

Do Not Use:
- generating and saving an image to disk (use generateImage instead)
- post-processing (denoise/sharpen/background removal) — only available via generateImage

Prompt rules (same as generateImage): one subject, simple composition. No text rendering. No complex scenes.`,
  inputSchema: {
    type: 'object',
    properties: {
      prompt: { type: 'string', description: 'Text description. One clear subject, simple composition. Complex scenes fail.' },
      model: { type: 'string', default: 'qwen-image', description: 'Image model. Default: qwen-image.' },
      seed: { type: 'number', description: 'Seed for reproducibility. Different seeds = different images.' },
      width: { type: 'number', default: 1024, description: 'Requested width. Free tier downsamples to 768px max.' },
      height: { type: 'number', default: 1024, description: 'Requested height. Free tier downsamples to 768px max.' },
      autoOptimize: { type: 'boolean', default: true, description: 'Auto-optimize prompt. Free text API may fail (402) → uses original.' },
      optimizeStyle: { type: 'string', default: 'auto', enum: ['auto', 'realistic', 'anime', 'painting', 'scifi', 'portrait'], description: 'Optimization style preset.' },
      enhance: { type: 'boolean', default: false, description: 'Pollinations enhance. HARMFUL on free tier. Keep false.' },
      safe: { type: 'boolean', default: false, description: 'Content filtering. Default off.' },
      noTextConstraint: { type: 'boolean', default: true, description: 'Append no-text/no-logo/no-watermark. Set false for intentional text/UI.' },
    },
    required: ['prompt'],
  },
};