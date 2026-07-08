---
title: 可用模型列表与状态
category: reference
updated: 2026-07-03
---

# 可用模型列表与状态

> 内置实测常量表，不依赖 Pollinations `/models` API（该 API 返回不准）。

## 图像模型

### ✅ 可用（免费版实测通过）

| 模型 | 最佳用途 |
|---|---|
| `flux` | 通用，默认推荐 |
| `turbo` | 快速生成 |
| `gptimage` | 写实 |
| `qwen-image` | 中文场景、文化意象 |
| `grok-imagine` | 创意 |
| `zimage` | 通用 |
| `wan-image` | 中文场景 |
| `ideogram-v4-turbo` | 文字渲染 |
| `nova-canvas` | 通用 |
| `klein` | 通用 |
| `sana` | 快速 |
| `p-image` | 通用 |

### ❌ 不可用（服务端故障，持续）

| 模型 | 用途 | 状态 |
|---|---|---|
| `nanobanana` | 图生图 | HTTP 500 |
| `seedream` | 图生图 | HTTP 500 |
| `kontext` | 图像编辑 | HTTP 500 |

## 文本模型

| 模型 | 描述 | reasoning | tools | aliases |
|---|---|---|---|---|
| `openai-fast` | GPT-OSS 20B Reasoning LLM (OVH) | ✅ | ✅ | openai, gpt-oss, gpt-oss-20b, ovh-reasoning |

## 已知限制

### 免费版降采样

无论请求多大尺寸，免费版强制返回 768px（按比例缩放）：

```
请求 1024×1024 → 返回 768×768
请求 1792×768  → 返回 1173×502（保持比例）
```

### model 参数对同 seed 失效

相同 prompt + seed 会命中缓存返回同一张图，忽略 model 参数。换 seed 获得不同图。

### listModels API 不可靠

- 图像 `/models` 只返回 `["sana"]`（实际 12 个可用）
- 文本 `/models` 恰好返回正确（仅 openai-fast）

image-forge-mcp 使用内置常量表，不调此 API。
