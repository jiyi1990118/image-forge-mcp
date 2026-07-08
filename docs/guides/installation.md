---
title: 安装指南
category: guides
updated: 2026-07-07
---

# 安装指南

## 前置要求

| 依赖 | 版本 | 用途 |
|---|---|---|
| Node.js | >= 18 | 运行 MCP server |
| npm | >= 9 | 安装依赖 |

> 文生图、抠图、清晰度处理、压缩均基于 npm 依赖，`npm install` 即可。`generateImage` 默认会尝试 Real-ESRGAN 增强；支持平台首次使用可自动下载平台二进制，不支持或失败时自动使用 sharp CPU fallback。

## 1. 克隆并安装

```bash
cd /Users/jary/Desktop/vision-mcp
npm install
npm run build
```

## 2. 首次抠图注意事项

`removeBackground` 是 `generateImage` 的参数能力，也会在 prompt 含游戏/素材/图标等关键词时自动触发。它基于 `@imgly/background-removal-node`，在默认增强之后运行；首次触发时会自动下载 ~170MB 的 ONNX 模型（缓存于 `node_modules/@imgly/...`），耗时 10-30 秒。后续调用复用缓存，速度更快。无需手动安装模型。

## 3. 验证 MCP server 启动

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | \
node /Users/jary/Desktop/vision-mcp/dist/index.js
```

应返回包含 serverInfo 的 JSON 响应。

## 4. 全部 7 个工具可用

安装 + 构建后，所有工具立即可用：

- `generateImage` / `generateImageUrl` — 文生图（generateImage 默认返回路径，含默认 Real-ESRGAN auto 增强、sharp fallback、可选降噪、抠图、压缩）
- `enhanceImage` — 对已有图片用 Real-ESRGAN ncnn-vulkan 做 2x/3x/4x 高清化
- `optimizePrompt` — prompt 精简
- `listImageModels` / `listTextModels` — 模型查询
- `respondText` — LLM 文本生成

## 5. 可选：神经降噪模型

`generateImage` 默认不降噪。若需要更高质量的神经降噪，传 `denoise=true`、`denoiseMethod='neural'`，放置一个 DnCNN 类 ONNX 模型并设置环境变量：

```json
"environment": {
  "DENOISE_MODEL_PATH": "/path/to/dncnn.onnx"
}
```

未设置时神经降噪自动回退 median，不影响默认流程。

## 6. 可选：Real-ESRGAN 预检与高清化

`generateImage` 默认会尝试 Real-ESRGAN。首次使用时会检查当前平台与缓存：支持平台且缓存/`REALESRGAN_PATH` 可用时直接使用；支持平台但未安装且 `realEsrganAutoDownload=true` 时自动下载；不可用或运行失败时默认使用 sharp CPU fallback。

`enhanceImage` 使用 Real-ESRGAN ncnn-vulkan 对已有图片做 2x/3x/4x 高清化。默认 `autoDownload=true`，首次调用会按当前平台下载官方 portable 包到项目 `.cache/realesrgan/v0.2.5.0/<platform>/`；也可通过 `REALESRGAN_CACHE_DIR` 改到自定义缓存目录：

| 平台 | 下载大小 |
|---|---:|
| Windows | ~43 MB zip |
| Linux | ~45 MB zip |
| macOS | ~49 MB zip |

解压后通常约 80-130 MB。

如果你已经手动安装，可配置：

```json
"environment": {
  "REALESRGAN_PATH": "C:\\tools\\realesrgan\\realesrgan-ncnn-vulkan.exe"
}
```

Windows 集成显卡要求 Intel/AMD Vulkan 驱动正常。建议先用 `scale=2`，稳定后再试 4。

下载 GitHub release 较慢时，可设置 `REALESRGAN_DOWNLOAD_BASE_URL` 为镜像前缀或包含 `{url}` 的模板。
