---
title: 整体架构与数据流
category: architecture
updated: 2026-07-07
---

# 整体架构与数据流

## 1. 架构总览

```
image-forge-mcp (TypeScript MCP Server, stdio transport)
│
├── Pollinations 适配层 (免费 API 封装)
│   ├── 图像生成  → image.pollinations.ai
│   └── 文本生成  → text.pollinations.ai (openai-fast)
│
├── 图像处理引擎 (本地 npm 依赖)
│   ├── 降噪    → sharp.median 或 ONNX 神经 (显式开启；denoiseService, 复用 onnxruntime)
│   ├── 清晰度  → sharp (CLAHE 对比度 + unsharp 锐化)
│   ├── 抠图    → @imgly/background-removal-node (ONNX 模型)
│   └── 压缩    → imagemin (pngquant + zopfli)
│
├── 图像增强/高清化
│   ├── generateImage → Real-ESRGAN auto，失败时 sharp CPU fallback
│   └── enhanceImage → 已有本地图片 Real-ESRGAN ncnn-vulkan (自动下载或 REALESRGAN_PATH)
│
├── Prompt 优化引擎
│   └── 精简器  → 调用 Pollinations 免费 LLM 压缩 prompt
│
├── 模型注册表 (内置常量表,解决 listModels 不准)
│
└── 配置层 (env 注入默认值)
```

## 2. 分层职责

| 层 | 目录 | 职责 | 依赖 |
|---|---|---|---|
| **入口层** | `src/index.ts` `src/server.ts` | MCP Server 实例、工具注册、stdio transport | MCP SDK |
| **Schema 层** | `src/schemas/` | 工具参数定义 + description | 无 |
| **工具层** | `src/tools/` | 7 个工具的请求处理、参数校验、结果组装 | services |
| **服务层** | `src/services/` | 业务逻辑（API 调用、抠图、清晰度增强、压缩、prompt 精简） | config, utils |
| **配置层** | `src/config/` | 默认值、模型注册表、常量 | 无 |
| **工具函数** | `src/utils/` | 文件操作、日志 | 无 |

## 3. 数据流

### 3.1 generateImage（生成 + 后处理）

```
agent 调用 generateImage(prompt, autoOptimize=true, denoise=false, ...)
  │
  ├─ autoOptimize=true 且 prompt > 40 词?
  │   └─ YES → 调 optimizePrompt(prompt, style) 精简
  │   └─ NO → 直接用原 prompt
  │
  ├─ 追加默认 no-text 约束
  │   └─ "No text, no letters, no words, no readable signs, no logos, no watermark."
  │
  ├─ 构建 image.pollinations.ai URL → fetch 图片 → arrayBuffer
  │
  ├─ 存原始图 <fileName>.<format>
  │
  ├─ clarity options enabled? → clarityService.applyClarity(rawPath → _processed.png)
  │   └─ [denoise 默认 false] median 或 neural(ONNX, 需 DENOISE_MODEL_PATH, 否则回退 median)
  │   └─ [enhanceContrast 默认 false] clahe
  │   └─ [sharpen 默认 false] unsharp
  │
  ├─ enhancement (默认 realEsrgan=true, enhanceBackend=auto)
  │   └─ 当前环境支持且二进制存在/可自动下载? → Real-ESRGAN ncnn-vulkan
  │   └─ 不支持/Vulkan 不可用/运行失败 → sharp CPU fallback (默认)
  │
  ├─ removeBackground? → backgroundRemovalService(增强后 PNG → 透明 PNG)
  │
  ├─ compress? → pngquant+zopfli (仅 PNG，默认 true)
  │
  ├─ returnMode=path (默认) → 返回 raw/final 本地路径和元数据
  │   └─ returnMode=binary 或 both → 返回图片内容或图片内容+路径
  │
  └─ removeBackground 素材关键词自动检测: asset/icon/sprite/item/weapon/sword/shield/inventory/素材/图标/道具/武器/装备 等
     （显式传值优先于自动检测）
```

### 3.2 optimizePrompt（prompt 精简）

```
agent 调用 optimizePrompt(prompt, style="auto", targetWords=30)
  │
  ├─ style="auto"? → 检测 prompt 关键词选择 style
  │
  ├─ 构建 system prompt (含 style 策略 + targetWords)
  │
  ├─ 调 text.pollinations.ai/openai-fast
  │   └─ POST /openai { model, messages:[{system},{user:prompt}] }
  │
  ├─ 解析返回,提取精简后 prompt
  │
  └─ 返回 { optimizedPrompt, originalPrompt, compressionRatio, style }
```

### 3.3 enhanceImage（已有图片高清化）

```
agent 调用 enhanceImage(inputPath, scale=2, model="realesr-animevideov3", autoDownload=true)
  │
  ├─ REALESRGAN_PATH 已设置?
  │   └─ YES → 直接使用指定二进制
  │   └─ NO  → 查找 .cache/realesrgan/v0.2.5.0/<platform>/
  │           └─ 不存在且 autoDownload=true → 下载当前平台 portable 包并解压
  │
  ├─ 输入图有 alpha?
  │   └─ YES → 拆分 RGB + alpha，Real-ESRGAN 只处理 RGB，最后放大 alpha 并合回
  │   └─ NO  → 直接处理原图
  │
  ├─ spawn realesrgan-ncnn-vulkan -i input -o output -n model -s scale
  │
  ├─ 可选 removeBackground=true → ONNX 抠图
  │
  └─ 返回增强 PNG base64 + input/output/model/scale/binary 信息
```

## 4. 关键设计约束

- **stdio transport**：所有日志输出到 stderr（不能污染 stdout 的 MCP 通信）
- **无外部状态**：所有配置通过 env 注入，不写持久化状态文件
- **Real-ESRGAN 可选且有 fallback**：默认 `generateImage` 会尝试 Real-ESRGAN auto 增强；支持平台缺少二进制时可自动下载，环境不支持或运行失败时默认 sharp CPU fallback，不阻塞文生图流程。`enhanceImage` 仍是已有本地图片的独立 Real-ESRGAN 工具。
- **错误友好**：所有工具捕获错误返回 `{ isError: true, content: [错误说明] }`，不抛异常崩溃
- **默认避免图片文字**：`generateImage` 与 `generateImageUrl` 在实际生成 prompt 后追加 no-text/no-logo/no-watermark 约束；如果用户明确要生成文字，目前没有单独关闭开关，需要调整代码
