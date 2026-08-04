# image-forge-mcp

[![npm version](https://img.shields.io/npm/v/@npm_xiyuan/image-forge-mcp.svg)](https://www.npmjs.com/package/@npm_xiyuan/image-forge-mcp)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-339933.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-stdio-6f42c1.svg)](https://modelcontextprotocol.io/)

[English](README.md) | **简体中文**

> 零 API Key 的图像生成与增强 MCP Server，支持本地后处理、透明游戏素材、Real-ESRGAN 高清化、prompt 优化和免费文本生成。

`image-forge-mcp` 封装 Pollinations 免费图像/文本 API，并在本地补上一套实用图像流水线：prompt 精简、可选清晰度处理、PNG 压缩、ONNX 抠图，以及 Real-ESRGAN ncnn-vulkan 高清增强。生成图默认会在 Real-ESRGAN 不可用时回退到 sharp CPU 增强。

## 为什么使用它

- **不需要 API Key**：默认直接使用 Pollinations 免费图像与文本接口。
- **文生图 + 本地增强**：`generateImage` 会保存原图，按需做清晰度处理，再执行 Real-ESRGAN 或 sharp fallback 增强。
- **透明游戏素材**：asset/icon/item/sprite/weapon/equipment 等素材类 prompt 可自动追加主体完整、边缘清晰约束，并自动抠图。
- **默认返回路径**：生成图片默认返回本地路径，避免 MCP 响应里塞入大段 base64。
- **Real-ESRGAN 自动选型**：按 prompt 意图为生成图选择合适的增强模型。
- **prompt 优化**：长 prompt 可先由免费 LLM 压缩，提高免费版生成稳定性。

## 环境要求

- Node.js `>=18`
- npm
- 可选：支持 Vulkan 的 GPU/驱动，用于 Real-ESRGAN ncnn-vulkan

`generateImage` 默认使用 `enhanceBackend: "auto"`：优先尝试 Real-ESRGAN，Real-ESRGAN 或 Vulkan 不可用时回退到 sharp CPU 增强。

## 安装

从 npm 安装：

```bash
npm install -g @npm_xiyuan/image-forge-mcp
```

或克隆源码并本地构建：

```bash
git clone https://github.com/jiyi1990118/image-forge-mcp.git
cd image-forge-mcp
npm install
npm run build
```

## MCP 客户端配置

全局 npm 安装后，让 MCP 客户端直接运行包内二进制：

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

本地源码方式则先运行 `npm run build`，再指向 `dist/index.js`：

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

更多示例见：[MCP 客户端配置](docs/guides/mcp-config.md)。

## 工具列表

| 工具 | 用途 |
|---|---|
| `generateImage` | 文生图，保存原图和最终图，默认返回路径。默认执行 Real-ESRGAN auto 增强，失败时 sharp fallback。 |
| `generateImageUrl` | 只返回可分享的 Pollinations 图片 URL，不下载、不后处理。 |
| `listImageModels` | 列出内置图像模型注册表和推荐用途。 |
| `listTextModels` | 列出可用文本模型和能力。 |

## 快速示例

在你的 MCP 客户端中直接说：

```text
生成透明背景游戏素材：彩色屠龙刀，主体完整，边缘分明
```

```text
生成一张写实产品图：木桌上的陶瓷咖啡杯
```

```text
生成透明背景游戏素材图标：彩色屠龙刀，主体完整，边缘分明
```

## `generateImage` 默认行为

默认图像流水线：

```text
generate -> save raw -> optional clarity -> enhancement -> optional background removal -> compression -> return path
```

重要默认值：

| 参数 | 默认值 |
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

`realEsrganModel: "auto"` 现在默认选择 `realesr-animevideov3` 作为生成图增强模型。显式传入模型仍会覆盖自动选择，因此只有你明确需要时才传 `realesrgan-x4plus` 或 `realesrgan-x4plus-anime`。

## Prompt 建议

- 优先一个主体、一个构图、一个视觉氛围。
- 生成透明素材时，建议 prompt 写 plain white background，再传 `removeBackground: true`；不要依赖图像模型直接生成透明背景。
- 图标/素材建议包含 `game asset`、`item icon`、`weapon`、`equipment`、`fully visible`、`uncropped`、`sharp outline` 等意图词。
- 人像、图标、素材建议保持 `noTextConstraint: true`。只有生成 UI 截图、标签、海报文字或明确需要文字时才设为 `false`。
- 开发者/工位图建议使用 `blurred screens` 和 `abstract UI shapes`，避免 detailed code、太多显示器和过多桌面道具。

## 环境变量

| 变量 | 用途 |
|---|---|
| `OUTPUT_DIR` | 生成图片默认输出目录。 |
| `IMAGE_MODEL` | 默认 Pollinations 图像模型。 |
| `IMAGE_WIDTH` / `IMAGE_HEIGHT` | 请求生成尺寸。Pollinations 免费版原始输出仍会限制在约 768px。 |
| `IMAGE_AUTO_OPTIMIZE` | 是否默认启用 prompt 自动精简。 |
| `IMAGE_OPTIMIZE_STYLE` | prompt 精简风格：`auto`、`realistic`、`anime`、`painting`、`scifi`、`portrait`。 |
| `IMAGE_ENHANCE` | Pollinations `enhance` 参数。默认 `false`，因为免费版通常效果更差。 |
| `IMAGE_SAFE` | Pollinations 内容过滤。 |
| `TEXT_MODEL` | 默认文本模型。 |
| `TEXT_TEMPERATURE` / `TEXT_TOP_P` | 文本生成采样控制。 |
| `REALESRGAN_PATH` | 使用已有 Real-ESRGAN 二进制，跳过自动下载。 |
| `REALESRGAN_CACHE_DIR` | 覆盖 Real-ESRGAN 自动下载缓存目录。 |
| `REALESRGAN_DOWNLOAD_BASE_URL` | 覆盖或镜像 Real-ESRGAN 下载地址。 |
| `REALESRGAN_RECHECK_MS` | Real-ESRGAN 不可用时重新探测间隔（默认 300000）。 |
| `DENOISE_MODEL_PATH` | 可选 DnCNN 类 ONNX 神经降噪模型路径。 |
| `BG_REMOVAL_TIMEOUT_MS` | ONNX 抠图超时（默认 300000）。 |
| `DEBUG` | 开启 stderr 调试日志。 |

## 已知限制

- Pollinations 免费版原始图像输出会限制在约 768px，本地增强在此之后执行。
- 相同 prompt + 相同 seed 可能命中缓存，即使换 model 参数也返回同一张图；比较模型时请换 seed。
- 首次抠图会下载 ONNX 模型，可能需要 10-30 秒。
- Real-ESRGAN 需要可用的 Vulkan 运行环境。`generateImage` 会在 Real-ESRGAN 不可用时回退到 sharp。
- 日志必须输出到 stderr，因为 stdout 保留给 MCP JSON-RPC。

## 文档

完整文档在 [`docs/`](docs/README.md)：

- [安装指南](docs/guides/installation.md)
- [快速上手](docs/guides/quickstart.md)
- [MCP 客户端配置](docs/guides/mcp-config.md)
- [工具参数速查](docs/reference/tools.md)
- [可用模型](docs/reference/models.md)
- [环境变量](docs/reference/env-vars.md)
- [架构总览](docs/architecture/overview.md)
- [Pollinations 免费版分析](docs/design/pollinations-analysis.md)

## 开发

```bash
npm install
npm run build
npm test
```

可用脚本：

- `npm run build`：编译 TypeScript 到 `dist/`。
- `npm run start`：运行 `node dist/index.js`。
- `npm run dev`：监听 TypeScript 编译。
- `npm test`：构建并运行 Node.js 测试。

MCP 客户端应加载 `dist/index.js`，所以编辑源码后需要重新构建。

## License

MIT。见 [LICENSE](LICENSE)。
