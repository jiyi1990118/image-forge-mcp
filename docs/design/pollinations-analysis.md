---
title: Pollinations 免费版 API 实测分析
category: design
updated: 2026-07-03
---

# Pollinations 免费版 API 实测分析

> 本文记录对 Pollinations.ai 免费版（anonymous tier）的实际测试结果，作为 image-forge-mcp 功能裁剪的依据。

## 1. 三套 API 端点

| 服务 | BaseURL | 用途 |
|---|---|---|
| 图像 | `https://image.pollinations.ai/prompt/{enc}` | 文生图、图生图 |
| 文本 | `https://text.pollinations.ai/{enc}` | LLM 文本生成 |
| 模型列表 | `{baseURL}/models` | 查询可用模型 |

## 2. 功能可用性矩阵

### ✅ 免费可用

| 功能 | 端点 | 实测结果 | 说明 |
|---|---|---|---|
| 文生图 | `image.pollinations.ai/prompt/{enc}` | HTTP 200 | 12 个模型可用（见下表） |
| 文本生成 (LLM) | `text.pollinations.ai/{enc}` | HTTP 200 | openai-fast (gpt-oss-20b)，支持 reasoning + tools |
| 文本生成 (OpenAI 兼容) | `POST text.pollinations.ai/openai` | HTTP 200 | 返回标准 chat.completion 格式 |

### ❌ 免费不可用

| 功能 | 端点 | 实测结果 | 原因 |
|---|---|---|---|
| 图生图编辑 (editImage) | `image.pollinations.ai` + `image=` 参数 | HTTP 500 | 依赖 kontext/nanobanana/seedream，三者全 500 |
| 参考图生成 (generateImageFromReference) | 同上 | HTTP 500 | 同上 |
| 音频 TTS (respondAudio) | `text.pollinations.ai` | HTTP 404 | 端点不存在，无 audio 模型对 anonymous 开放 |

## 3. 图像模型实测（HTTP 状态码）

| 模型 | 状态 | 最佳用途 |
|---|---|---|
| `flux` | ✅ 200 | 通用，默认推荐 |
| `turbo` | ✅ 200 | 快速生成 |
| `gptimage` | ✅ 200 | 写实 |
| `qwen-image` | ✅ 200 | 中文场景、文化意象 |
| `grok-imagine` | ✅ 200 | 创意 |
| `zimage` | ✅ 200 | 通用 |
| `wan-image` | ✅ 200 | 中文场景 |
| `ideogram-v4-turbo` | ✅ 200 | 文字渲染 |
| `nova-canvas` | ✅ 200 | 通用 |
| `klein` | ✅ 200 | 通用 |
| `sana` | ✅ 200 | 快速 |
| `p-image` | ✅ 200 | 通用 |
| `nanobanana` | ❌ 500 | 图生图（服务端故障，持续） |
| `seedream` | ❌ 500 | 图生图（服务端故障，持续） |
| `kontext` | ❌ 500 | 图像编辑（服务端故障，持续） |

## 4. 关键限制

### 4.1 降采样（最严重）

无论请求多大尺寸，免费版强制返回 **768px**（按比例缩放）：

```
请求 1024×1024 → 返回 768×768
请求 2048×2048 → 返回 768×768
请求 4096×4096 → 返回 768×768
请求 1792×768  → 返回 1173×502（保持比例）
```

**应对：** 接受 Pollinations 原始输出 768px 限制。`generateImage` 随后默认做本地增强：环境可用时使用 Real-ESRGAN ncnn-vulkan；平台不支持、Vulkan 不可用或运行失败时使用 sharp CPU fallback。也可用 `denoise`/`sharpen`/`enhanceContrast` 参数做清晰度增强，或用付费版 token 解锁原生高清。

### 4.2 model 参数对同 seed 失效

免费版对相同 prompt + seed 会命中缓存返回同一张图，**忽略 model 参数**：

```
prompt=A, seed=123, model=flux     → 图X (MD5: abc...)
prompt=A, seed=123, model=qwen     → 图X (MD5: abc...)  ← 完全相同！
prompt=A, seed=456, model=flux     → 图Y (不同)
```

**应对：** 换 seed 获得不同图；文档明确说明此限制。

### 4.3 listModels 不可靠

`GET /models` 端点返回不全：

- 图像模型列表只返回 `["sana"]`（实际 12 个可用）
- 文本模型列表只返回 `openai-fast`（恰好这次正确）

**应对：** 内置实测常量表，不依赖 API。

### 4.4 enhance 参数有害

`enhance=true`（mcpollinations 默认）会让 Pollinations 用 LLM 扩写 prompt，在免费版下反而让 prompt 更复杂更糟。

**应对：** 默认 `enhance=false`，与 mcpollinations 相反。

### 4.5 推理步数少

免费版推理步数受限，复杂 prompt（多主体、多元素）质量显著下降。

**应对：** prompt 精简方案（optimizePrompt 工具 + 风格预设）。

## 5. 文本模型详情

免费版唯一可用文本模型：

```json
{
  "name": "openai-fast",
  "description": "GPT-OSS 20B Reasoning LLM (OVH)",
  "reasoning": true,
  "tier": "anonymous",
  "tools": true,
  "vision": false,
  "audio": false,
  "aliases": ["openai", "gpt-oss", "gpt-oss-20b", "ovh-reasoning"]
}
```

- 20B 参数推理模型
- 支持 reasoning（思维链）
- 支持 tool calling
- OpenAI 兼容格式
- 可用于 prompt 精简（零额外成本）

## 6. 功能裁剪决策

基于实测，image-forge-mcp 的功能取舍：

| 保留 | 砍掉 | 说明 |
|---|---|---|
| 文生图 | 图生图编辑 | editImage（免费版 500） |
| 文本生成 | 参考图生成 | generateImageFromReference（500） |
| ONNX 抠图 | 音频 TTS | respondAudio（404） |
| sharp 清晰度增强 + Real-ESRGAN 默认增强 | generateImageHD | Real-ESRGAN 已进入 `generateImage` 默认增强路径；`enhanceImage` 仍保留为处理已有本地图片的独立工具 |
| prompt 精简 | | |
