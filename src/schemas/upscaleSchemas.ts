import type { ToolSchema } from '../types/schemas.js';

export const enhanceImageSchema: ToolSchema = {
  name: 'enhanceImage',
  description: `Purpose
--------
Upscale and enhance an existing local image using Real-ESRGAN ncnn-vulkan. Downloads the current-platform portable binary on first use when needed.

Use When
--------
Use this tool when the user:
- wants higher-quality game assets, icons, illustrations, or generated images
- says "超分" / "高清化" / "upscale" / "enhance image" / "Real-ESRGAN"
- has an existing image path and wants 2x/3x/4x neural reconstruction
- is unhappy with simple denoise/sharpen from generateImage and wants stronger neural enhancement

Do Not Use
--------
Do not use for:
- generating a new image from text (use generateImage instead)
- getting an image URL only (use generateImageUrl instead)
- removing background only (generateImage has removeBackground for generated images)
- machines without Vulkan-capable GPU/driver unless the user accepts that Real-ESRGAN may fail

Input
--------
inputPath: string — Existing local image path to enhance.
outputPath: string (optional) — Output PNG path. Default: same directory with _realesrgan_x{scale}.png suffix.
model: enum (optional, default: realesrgan-x4plus-anime) — realesrgan-x4plus | realesrgan-x4plus-anime | realesr-animevideov3.
scale: enum (optional, default: 2) — 2|3|4. Windows integrated GPUs should start with 2.
autoDownload: boolean (optional, default: true) — Download current-platform Real-ESRGAN package (~45-50 MB zip, ~100 MB extracted) to the project .cache/realesrgan/v0.2.5.0/<platform> directory on first use if REALESRGAN_PATH is not set; REALESRGAN_CACHE_DIR overrides the cache root.
timeoutMs: number (optional, default: 120000) — Process timeout.
removeBackground: boolean (optional, default: false) — Run background removal after Real-ESRGAN. Recommended when the input has bad alpha/white masks.
removeBackgroundStrategy: enum (optional, default: auto) — auto|default|preserve-light-subject|clean-edge. auto samples image edges to pick a safer strategy.

Output
--------
content: [image (enhanced PNG base64), text (input/output/model/scale/binary info)]

Limitations
--------
- Requires a Vulkan-capable GPU/driver. Windows integrated GPUs work only when Intel/AMD Vulkan drivers are available.
- First auto-download may be slow and needs internet access.
- This is a standalone tool for existing images; generateImage remains the text-to-image tool.

Examples
--------
User: "把 /path/staff.png 用 Real-ESRGAN 高清化"
→ Use this tool.

User: "这个游戏素材放大 2 倍"
→ Use this tool with scale=2.

User: "生成一张法杖图"
→ Do NOT use. Use generateImage instead.`,
  inputSchema: {
    type: 'object',
    properties: {
      inputPath: { type: 'string', description: 'Existing local image path to enhance.' },
      outputPath: { type: 'string', description: 'Output PNG path. Default: same directory with _realesrgan_x{scale}.png suffix.' },
      model: { type: 'string', default: 'realesrgan-x4plus-anime', enum: ['realesrgan-x4plus', 'realesrgan-x4plus-anime', 'realesr-animevideov3'], description: 'Real-ESRGAN model. anime is recommended for game assets/icons.' },
      scale: { type: 'number', default: 2, enum: [2, 3, 4], description: 'Upscale factor. Start with 2 on Windows integrated GPUs.' },
      autoDownload: { type: 'boolean', default: true, description: 'Auto-download current-platform Real-ESRGAN binary if REALESRGAN_PATH is not set.' },
      timeoutMs: { type: 'number', default: 120000, description: 'Process timeout in milliseconds.' },
      removeBackground: { type: 'boolean', default: false, description: 'Run background removal after Real-ESRGAN. Useful for transparent assets with bad alpha/white masks.' },
      removeBackgroundStrategy: { type: 'string', default: 'auto', enum: ['auto', 'default', 'preserve-light-subject', 'clean-edge'], description: 'Background-removal strategy. auto samples image edge colors; explicit values override auto.' },
    },
    required: ['inputPath'],
  },
};
