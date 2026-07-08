---
title: 工具设计详解
category: architecture
updated: 2026-07-07
---

# 工具设计详解

## 概览：7 个工具

| # | 工具 | 来源 | 类型 | 说明 |
|---|---|---|---|---|
| 1 | `generateImage` | Pollinations + 自研 | 图像+后处理 | 文生图+存盘+默认路径响应，内置 clarity、默认增强、抠图、压缩 |
| 2 | `generateImageUrl` | Pollinations | 图像 | 仅返回可分享 URL |
| 3 | `enhanceImage` | Real-ESRGAN ncnn-vulkan | 图像高清化 | 对已有本地图片做 2x/3x/4x 神经重建 |
| 4 | `optimizePrompt` | 自研 | 优化 | 用免费 LLM 精简 prompt |
| 5 | `listImageModels` | 内置常量 | 查询 | 可用+不可用图像模型状态表 |
| 6 | `listTextModels` | 内置常量 | 查询 | 免费 LLM 模型列表 |
| 7 | `respondText` | Pollinations | 文本 | LLM 文本生成 |

> 已移除独立工具：`removeBackground`、`convertImage`（其能力合并为 `generateImage` 参数）。`enhanceImage` 保留为独立工具，因为它处理已有本地图片，并且需要可选 Real-ESRGAN ncnn-vulkan 二进制/Vulkan 环境。

## 1. generateImage

**用途：** 文生图，存盘，默认返回本地路径。生成后默认执行图像增强；clarity 处理需显式开启 `denoise`、`sharpen` 或 `enhanceContrast`。需要图片内容时传 `returnMode: 'binary'` 或 `'both'`。

**默认 prompt 约束：** 实际发送到 Pollinations 前默认会追加 `No text, no letters, no words, no readable signs, no logos, no watermark.`，用于减少图片文字、logo 和水印。该约束应用于优化后的 prompt；若 `autoOptimize=false`，则应用于用户原始 prompt。传 `noTextConstraint=false` 可关闭，适合 UI/海报/文字内容或与屏幕代码场景冲突时使用。

**prompt 质量策略：** 生成质量优先依赖 prompt 聚焦，而不是后处理。建议保持一个主体、一个构图、一个视觉氛围；开发者工位场景优先写 blurred screens、abstract UI shapes，避免多个显示器、详细代码、键盘/咖啡/桌面道具同时堆叠。

**生成参数：**

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `prompt` | string | (必填) | 图像描述，可长可短 |
| `model` | string | "flux" | 图像模型 |
| `seed` | number | random | 复现/变体 |
| `width` / `height` | number | 1024 | 请求尺寸（免费版降采样到 768） |
| `autoOptimize` | boolean | true | 自动精简 prompt |
| `optimizeStyle` | enum | "auto" | 精简风格预设 |
| `enhance` | boolean | false | Pollinations enhance（不推荐） |
| `safe` | boolean | false | 内容过滤 |
| `noTextConstraint` | boolean | true | 追加 no-text/no-logo/no-watermark 约束；可显式关闭 |
| `outputPath` | string | "./vision-output" | 存盘目录 |
| `fileName` | string | auto | 文件名（不含扩展名） |
| `format` | enum | "png" | png/jpeg/jpg/webp（处理变体恒为 PNG） |
| `compress` | boolean | true | PNG 用 pngquant+zopfli 压缩 |
| `returnMode` | enum | "path" | `path`=只返回本地路径；`binary`=返回图片二进制；`both`=两者都返回 |

**后处理参数（生成后应用，原始图始终保留）：**

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `denoise` | boolean | **false** | 是否降噪（默认关闭；噪点明显时显式开启） |
| `denoiseMethod` | enum | **"median"** | `median`=sharp 快零依赖；`neural`=ONNX 高质量慢（需 `DENOISE_MODEL_PATH`，否则回退 median） |
| `denoiseRadius` | number | 1 | median 滤波半径（1=轻度，2=更强但更柔），仅 median |
| `sharpen` | boolean | false | unsharp mask 锐化 |
| `enhanceContrast` | boolean | false | CLAHE 局部对比度 |
| `removeBackground` | boolean | false | ONNX 抠图→透明 PNG；素材/道具关键词自动开启，显式传值优先 |
| `realEsrgan` | boolean | true | 默认对生成图做增强 |
| `enhanceBackend` | enum | "auto" | auto=Real-ESRGAN first，sharp fallback by default；也可选 realesrgan/sharp/none |
| `enhanceFallback` | enum | "sharp" | Real-ESRGAN 不可用或失败时的兜底 |
| `realEsrganModel` | enum | `auto` | 生成图增强用 Real-ESRGAN 模型；`auto` 按 prompt 选择，显式模型值优先 |
| `realEsrganScale` | enum | 2 | 2/3/4 |
| `realEsrganAutoDownload` | boolean | true | 支持平台缺少二进制时自动下载 |
| `realEsrganTimeoutMs` | number | 120000 | 子进程超时 |

**处理流程：**
```
generate raw → optional clarity (denoise/sharpen/CLAHE off by default) → enhancement (Real-ESRGAN auto, sharp fallback) → optional removeBackground → compress → return path/binary based on returnMode
```
顺序理由：先在不透明原图做 clarity 和增强，最后抠图，避免 sharp/Real-ESRGAN 作用于最终 alpha 通道。

**默认行为：** 默认产出原始图和增强后的最终 PNG，本地路径通过文本返回。只有显式开启 `denoise`、`sharpen` 或 `enhanceContrast` 时才会产出 clarity `_processed.png` 中间文件。Real-ESRGAN/Vulkan 支持且二进制可用时优先使用；支持但缺失时自动下载；不支持或运行失败时使用 sharp CPU fallback。`realEsrganModel` 默认 `auto`：default、anime/manga/cartoon/illustration/painting/digital art、水墨/水彩/brush/ink/watercolor、asset/icon/item/sprite/weapon/equipment prompt 默认 → `realesr-animevideov3`；只有这些素材类 prompt 同时明确出现 upscale/enlarge/super-resolution/超分/放大/高清化 等放大意图时 → `realesrgan-x4plus-anime`；photo/photograph/realistic/photorealistic/camera/DSLR/lens prompt → `realesrgan-x4plus`。`portrait` 只当构图词，不单独触发照片模型。显式传具体模型会覆盖自动选择。`denoise`、`sharpen` 和 `enhanceContrast` 仍默认关闭，`compress` 默认开启。

**素材 prompt 约束：** asset/icon/item/sprite/weapon/equipment/素材/图标/道具/武器/装备 等 prompt 在调用 Pollinations 前会自动追加完整主体和边缘约束，要求 complete object、fully visible、uncropped、clean silhouette、sharp outline、well-defined edges。英文关键词按 token 匹配，避免 iconic/bionic/endgame 这类子串误触发；texture 不再自动触发素材抠图。这解决的是原始生成阶段主体被裁切、轮廓发软的问题，不依赖后处理补救。

## 2. generateImageUrl

**用途：** 仅生成可分享 URL，不下载不存盘，无后处理（后处理需本地文件）。

**参数：** 同 generateImage 的生成参数，但无 outputPath/fileName/format/compress 及所有后处理参数。

## 3. enhanceImage

**用途：** 对已有本地图片使用 Real-ESRGAN ncnn-vulkan 做高清化，适合生成图二次放大、游戏素材、图标、插画。它不是文生图工具；`generateImage` 有自己的默认增强编排。`enhanceImage` 仍返回图片二进制 plus 文本信息。

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `inputPath` | string | (必填) | 已存在的本地图片路径 |
| `outputPath` | string | 同目录 `_realesrgan_x{scale}.png` | 输出 PNG 路径 |
| `model` | enum | `realesrgan-x4plus-anime` | `realesrgan-x4plus`/`realesrgan-x4plus-anime`/`realesr-animevideov3` |
| `scale` | enum | `2` | `2`/`3`/`4`，Windows 集显建议先试 2 |
| `autoDownload` | boolean | `true` | 未设置 `REALESRGAN_PATH` 且缓存中无二进制时自动下载 |
| `timeoutMs` | number | `120000` | Real-ESRGAN 子进程超时 |
| `removeBackground` | boolean | `false` | Real-ESRGAN 后再跑 ONNX 抠图，适合透明素材边缘质量不佳时使用 |

**二进制来源：** 优先使用 `REALESRGAN_PATH`；否则在 `.cache/realesrgan/v0.2.5.0/<platform>/` 查找；仍不存在且 `autoDownload=true` 时下载当前平台 portable 包。`REALESRGAN_DOWNLOAD_BASE_URL` 可配置下载镜像。

**alpha 处理：** Real-ESRGAN ncnn-vulkan 对 alpha 支持不稳定。输入图有 alpha 时，服务会先拆出 RGB 和 alpha，只对 RGB 做高清化，再将 alpha 等比例放大后合回输出 PNG。

## 4. optimizePrompt

**用途：** 精简 prompt 以适配免费版。独立工具，可与 generateImage 解耦。

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `prompt` | string | (必填) | 原始 prompt |
| `style` | enum | "auto" | auto/realistic/anime/painting/scifi/portrait |
| `targetWords` | number | 30 | 目标词数（20-40 推荐） |

## 5. listImageModels

无参数。返回内置模型常量表 `[{ name, status, bestFor }]`。

## 6. listTextModels

无参数。返回免费文本模型 `[{ name, description, reasoning, tools, aliases }]`。

## 7. respondText

LLM 文本生成。

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `prompt` | string | (必填) | 用户输入 |
| `system` | string | "" | 系统提示 |
| `temperature` | number | 0.7 | 0=聚焦 2=创意 |
| `top_p` | number | 0.9 | 核采样 |
| `seed` | number | random | 复现 |

## MCP Prompt 模板

| name | description |
|---|---|
| `image-prompt-guide` | 免费版生图 prompt 编写指南，agent 可主动拉取 |
