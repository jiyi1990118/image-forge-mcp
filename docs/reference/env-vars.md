---
title: 环境变量配置
category: reference
updated: 2026-07-07
---

# 环境变量配置

> 通过 MCP 配置的 `env` 字段注入默认值。工具调用省略参数时自动使用。仅以下变量有效。旧版 `ENHANCE_DEFAULT_*` / `TEXT_SYSTEM` 已移除；`REALESRGAN_*` 同时服务于 `generateImage` 的默认增强路径和独立 `enhanceImage` 工具。

## 图像生成

| 变量 | 默认 | 说明 |
|---|---|---|
| `IMAGE_MODEL` | `flux` | 默认图像模型 |
| `IMAGE_WIDTH` | `1024` | 默认请求宽度 |
| `IMAGE_HEIGHT` | `1024` | 默认请求高度 |
| `IMAGE_AUTO_OPTIMIZE` | `true` | 默认是否自动精简 prompt |
| `IMAGE_OPTIMIZE_STYLE` | `auto` | 默认精简风格 |
| `IMAGE_ENHANCE` | `false` | Pollinations enhance（不推荐） |
| `IMAGE_SAFE` | `false` | 内容过滤 |

## 文本生成

| 变量 | 默认 | 说明 |
|---|---|---|
| `TEXT_MODEL` | `openai-fast` | 默认文本模型 |
| `TEXT_TEMPERATURE` | `0.7` | 默认温度 |
| `TEXT_TOP_P` | `0.9` | 默认 top_p |

## 输出

| 变量 | 默认 | 说明 |
|---|---|---|
| `OUTPUT_DIR` | `./vision-output` | 默认输出目录 |

## 后处理（可选）

| 变量 | 默认 | 说明 |
|---|---|---|
| `DENOISE_MODEL_PATH` | — | ONNX 神经降噪模型路径（DnCNN 类）。设置后 `generateImage(denoiseMethod='neural')` 可用；未设置则自动回退 median |

## Real-ESRGAN（可选，用于 generateImage 默认增强和 enhanceImage）

| 变量 | 默认 | 说明 |
|---|---|---|
| `REALESRGAN_PATH` | — | 已安装的 `realesrgan-ncnn-vulkan` 二进制路径。设置后跳过自动下载 |
| `REALESRGAN_CACHE_DIR` | `<project>/.cache/realesrgan/<version>` | 自动下载/解压缓存目录 |
| `REALESRGAN_DOWNLOAD_BASE_URL` | — | Real-ESRGAN 下载镜像。若包含 `{url}` 则替换原始 URL；否则按 `<base>/<original-url>` 拼接 |

`generateImage` 默认 `realEsrgan=true`、`enhanceBackend='auto'`、`realEsrganAutoDownload=true`。运行时会检查当前平台、缓存或 `REALESRGAN_PATH`，支持且缺少二进制时自动下载；不支持、Vulkan 不可用或运行失败时默认使用 sharp CPU fallback。

## 鉴权（可选，免费版不需要）

| 变量 | 默认 | 说明 |
|---|---|---|
| `POLLINATIONS_TOKEN` | — | API token（增强访问） |
| `POLLINATIONS_REFERRER` | — | referrer URL |

## 日志

| 变量 | 默认 | 说明 |
|---|---|---|
| `DEBUG` | `false` | 开启调试日志（输出到 stderr） |
