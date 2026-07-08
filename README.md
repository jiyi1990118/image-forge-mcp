# image-forge-mcp

[![npm version](https://img.shields.io/npm/v/@npm_xiyuan/image-forge-mcp.svg)](https://www.npmjs.com/package/@npm_xiyuan/image-forge-mcp)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-339933.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-stdio-6f42c1.svg)](https://modelcontextprotocol.io/)

**English** | [简体中文](README.zh-CN.md)

> A zero-key MCP server for image generation, local post-processing, transparent game assets, Real-ESRGAN enhancement, prompt optimization, and free text generation.

`image-forge-mcp` wraps the Pollinations free-tier APIs and adds a local image pipeline around them: prompt compression, optional clarity processing, PNG compression, ONNX background removal, and Real-ESRGAN ncnn-vulkan enhancement with a sharp CPU fallback for generated images.

## Why Use This MCP Server

- **No API key required**: use Pollinations free-tier image and text APIs out of the box.
- **Text-to-image with local enhancement**: `generateImage` saves the raw image, optionally applies clarity processing, then enhances with Real-ESRGAN or sharp fallback.
- **Transparent game assets**: asset/icon/item/sprite/weapon/equipment prompts can automatically get complete-subject constraints and background removal.
- **Path-first MCP responses**: generated images return local paths by default to avoid large base64 payloads.
- **Real-ESRGAN auto model selection**: generated images choose a suitable enhancement model by prompt intent.
- **Prompt optimization**: long prompts can be compressed by a free LLM before image generation.
- **Standalone upscaling**: enhance existing local images with Real-ESRGAN 2x/3x/4x.
- **Free text generation**: `respondText` uses Pollinations text models, including `openai-fast`.

## Requirements

- Node.js `>=18`
- npm
- Optional: Vulkan-capable GPU/driver for Real-ESRGAN ncnn-vulkan

`generateImage` defaults to `enhanceBackend: "auto"`: it tries Real-ESRGAN first and falls back to sharp CPU enhancement when Real-ESRGAN or Vulkan is unavailable. The standalone `enhanceImage` tool requires Real-ESRGAN to run successfully.

## Installation

Install from npm:

```bash
npm install -g @npm_xiyuan/image-forge-mcp
```

Or clone and build locally:

```bash
git clone https://github.com/jiyi1990118/image-forge-mcp.git
cd image-forge-mcp
npm install
npm run build
```

## MCP Client Configuration

For a global npm install, configure your MCP client to run the package binary:

```json
{
  "mcpServers": {
    "image-forge-mcp": {
      "command": "image-forge-mcp",
      "env": {
        "OUTPUT_DIR": "/Users/your-name/Pictures/image-forge-output"
      }
    }
  }
}
```

For a local clone, point the client at `dist/index.js` after running `npm run build`:

```json
{
  "mcpServers": {
    "image-forge-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/image-forge-mcp/dist/index.js"],
      "env": {
        "OUTPUT_DIR": "/Users/your-name/Pictures/image-forge-output"
      }
    }
  }
}
```

More examples: [MCP client configuration](docs/guides/mcp-config.md).

## Tools

| Tool | Purpose |
|---|---|
| `generateImage` | Generate an image, save raw + final files, and return paths by default. Uses Real-ESRGAN auto enhancement with sharp fallback. |
| `generateImageUrl` | Return a shareable Pollinations image URL only, without downloading or post-processing. |
| `enhanceImage` | Upscale/enhance an existing local image with Real-ESRGAN ncnn-vulkan. |
| `optimizePrompt` | Compress and improve long image prompts with a free LLM. |
| `listImageModels` | List the curated image model registry and recommended use cases. |
| `listTextModels` | List available text models and capabilities. |
| `respondText` | Generate text with a free Pollinations text model. |

## Quick Examples

Ask your MCP client:

```text
Generate a transparent game asset: a colorful dragon-slaying sword, complete subject, sharp edges
```

```text
Generate a realistic product photo of a ceramic coffee mug on a wooden desk
```

```text
Upscale /Users/your-name/Pictures/avatar.png by 2x with Real-ESRGAN
```

```text
Optimize this prompt for Pollinations: a very long image prompt...
```

```text
Use image-forge-mcp to explain how neural image upscaling works
```

## `generateImage` Defaults

The default image pipeline is:

```text
generate -> save raw -> optional clarity -> enhancement -> optional background removal -> compression -> return path
```

Important defaults:

| Parameter | Default |
|---|---|
| `returnMode` | `"path"` |
| `autoOptimize` | `true` |
| `noTextConstraint` | `true` |
| `denoise` | `false` |
| `sharpen` | `false` |
| `enhanceContrast` | `false` |
| `realEsrgan` | `true` |
| `enhanceBackend` | `"auto"` |
| `enhanceFallback` | `"sharp"` |
| `realEsrganModel` | `"auto"` |
| `realEsrganScale` | `2` |
| `compress` | `true` |

`realEsrganModel: "auto"` chooses:

- `realesr-animevideov3` for default generated images, stylized prompts, soft watercolor/ink/brush prompts, and asset/icon/item/sprite/weapon/equipment prompts by default.
- `realesrgan-x4plus-anime` only when those asset-style prompts also explicitly mention upscaling/enlarging/super-resolution.
- `realesrgan-x4plus` only for strong photo prompts such as photo, photograph, realistic, photorealistic, camera, DSLR, or lens.

`portrait` is treated as a composition term, not a photo signal, so `anime portrait` stays on `realesr-animevideov3`. Explicit `realEsrganModel` values always override the automatic choice.

## Prompt Tips

- Use one primary subject, one composition, and one visual mood.
- For transparent assets, prompt a plain white background and use `removeBackground: true`; avoid asking the image model to directly generate a transparent background.
- For icons/assets, include intent words such as `game asset`, `item icon`, `weapon`, `equipment`, `fully visible`, `uncropped`, and `sharp outline`.
- Keep `noTextConstraint: true` for portraits, icons, and assets. Set it to `false` only when text, UI screenshots, labels, or poster typography are intentional.
- For developer/workstation scenes, prefer `blurred screens` and `abstract UI shapes` instead of detailed code or many monitor elements.

## Environment Variables

| Variable | Purpose |
|---|---|
| `OUTPUT_DIR` | Default directory for generated images. |
| `IMAGE_MODEL` | Default Pollinations image model. |
| `IMAGE_WIDTH` / `IMAGE_HEIGHT` | Requested generation size. Pollinations free tier still caps raw output around 768px. |
| `IMAGE_AUTO_OPTIMIZE` | Enable or disable prompt auto-optimization. |
| `IMAGE_OPTIMIZE_STYLE` | Prompt optimization style: `auto`, `realistic`, `anime`, `painting`, `scifi`, or `portrait`. |
| `IMAGE_ENHANCE` | Pollinations `enhance` flag. Defaults to `false` because it is usually worse on the free tier. |
| `IMAGE_SAFE` | Pollinations content filtering. |
| `TEXT_MODEL` | Default text model. |
| `TEXT_TEMPERATURE` / `TEXT_TOP_P` | Text generation sampling controls. |
| `REALESRGAN_PATH` | Use an existing Real-ESRGAN binary instead of auto-download. |
| `REALESRGAN_CACHE_DIR` | Override the auto-download cache directory. |
| `REALESRGAN_DOWNLOAD_BASE_URL` | Override or mirror the Real-ESRGAN download base URL. |
| `DENOISE_MODEL_PATH` | Optional DnCNN-style ONNX model for neural denoise. |
| `POLLINATIONS_TOKEN` | Optional Pollinations token for enhanced access. Free use does not require it. |
| `POLLINATIONS_REFERRER` | Optional Pollinations referrer URL. |
| `DEBUG` | Enable debug logging to stderr. |

## Known Limitations

- Pollinations free-tier image output is capped around 768px before local enhancement.
- Same prompt + same seed may return the same image even if the model parameter changes; change the seed when comparing models.
- Background removal downloads an ONNX model on first use and can take 10-30 seconds the first time.
- Real-ESRGAN requires a Vulkan-capable runtime. `generateImage` falls back to sharp when Real-ESRGAN cannot run; `enhanceImage` surfaces the Real-ESRGAN failure.
- Logs must go to stderr because stdout is reserved for MCP JSON-RPC.

## Documentation

Full documentation lives in [`docs/`](docs/README.md):

- [Installation](docs/guides/installation.md)
- [Quickstart](docs/guides/quickstart.md)
- [MCP client configuration](docs/guides/mcp-config.md)
- [Tool reference](docs/reference/tools.md)
- [Available models](docs/reference/models.md)
- [Environment variables](docs/reference/env-vars.md)
- [Architecture overview](docs/architecture/overview.md)
- [Pollinations free-tier analysis](docs/design/pollinations-analysis.md)

## Development

```bash
npm install
npm run build
npm test
```

Available scripts:

- `npm run build`: compile TypeScript to `dist/`.
- `npm run start`: run `node dist/index.js`.
- `npm run dev`: watch TypeScript compilation.
- `npm test`: build and run Node.js tests.

The MCP client should load `dist/index.js`, so rebuild after editing source files.

## License

MIT. See [LICENSE](LICENSE).
