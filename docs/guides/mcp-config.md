---
title: MCP 客户端配置
category: guides
updated: 2026-07-03
---

# MCP 客户端配置

## opencode

编辑 `~/.config/opencode/opencode.json`：

```json
{
  "mcp": {
    "image-forge-mcp": {
      "command": ["node", "/Users/jary/Desktop/vision-mcp/dist/index.js"],
      "enabled": true,
      "type": "local",
      "environment": {
        "OUTPUT_DIR": "/Users/jary/Pictures/vision-output",
        "IMAGE_MODEL": "flux",
        "IMAGE_WIDTH": "1024",
        "IMAGE_HEIGHT": "1024"
      }
    }
  }
}
```

## Claude Desktop

编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "image-forge-mcp": {
      "command": "node",
      "args": ["/Users/jary/Desktop/vision-mcp/dist/index.js"],
      "env": {
        "OUTPUT_DIR": "/Users/jary/Pictures/vision-output"
      }
    }
  }
}
```

## Cursor

在 Cursor 设置 → MCP 中添加：

```json
{
  "mcpServers": {
    "image-forge-mcp": {
      "command": "node",
      "args": ["/Users/jary/Desktop/vision-mcp/dist/index.js"]
    }
  }
}
```

## 环境变量说明

> 仅以下变量有效。旧版的 `REALESRGAN_MODELS` 已移除；`REALESRGAN_PATH` 仍可用于 `generateImage` 默认增强和独立 `enhanceImage`。

| 变量 | 默认 | 说明 |
|---|---|---|
| `OUTPUT_DIR` | ./vision-output | 图片输出目录 |
| `IMAGE_MODEL` | flux | 默认图像模型 |
| `IMAGE_WIDTH` | 1024 | 默认宽度 |
| `IMAGE_HEIGHT` | 1024 | 默认高度 |
| `IMAGE_AUTO_OPTIMIZE` | true | 默认是否自动精简 prompt |
| `IMAGE_OPTIMIZE_STYLE` | auto | 默认精简风格 |
| `TEXT_MODEL` | openai-fast | 默认文本模型 |
| `TEXT_TEMPERATURE` | 0.7 | 默认温度 |
| `TEXT_TOP_P` | 0.9 | 默认 top_p |
| `DENOISE_MODEL_PATH` | — | 可选，ONNX 神经降噪模型路径（未设置则回退 median） |
| `REALESRGAN_PATH` | — | 可选，已安装的 Real-ESRGAN ncnn-vulkan 二进制路径 |
| `REALESRGAN_CACHE_DIR` | project cache | 可选，Real-ESRGAN 自动下载/解压缓存目录 |
| `REALESRGAN_DOWNLOAD_BASE_URL` | — | 可选，Real-ESRGAN 下载镜像前缀或 `{url}` 模板 |
| `DEBUG` | false | 调试日志输出到 stderr |

完整环境变量见 [reference/env-vars.md](../reference/env-vars.md)。
