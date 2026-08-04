---
title: 工具参数速查
category: reference
updated: 2026-07-07
---

# 工具参数速查

> agent 决策依据：快速查阅每个工具的参数、类型、默认值、行为说明。

## generateImage

文生图，存盘，默认返回本地路径，内置清晰度处理、默认增强、抠图和压缩。实际发送到 Pollinations 前会默认追加 no-text/no-logo/no-watermark 约束，减少图片内文字、logo 和水印。素材类 prompt（asset/icon/item/sprite/weapon/equipment 等）会额外追加 complete object、fully visible、uncropped、clean silhouette、sharp outline、well-defined edges 等完整主体和清晰边缘约束。需要图片内容时传 `returnMode: 'binary'` 或 `'both'`。

### 生成参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `prompt` | string | ✅ | — | 图像描述，可长可短，默认会自动精简 |
| `model` | string | — | `qwen-image` | 图像模型，见 models.md |
| `seed` | number | — | random | 不同 seed = 不同图 |
| `width` / `height` | number | — | `1024` | 请求尺寸（免费版降采样到 768） |
| `autoOptimize` | boolean | — | `true` | 自动精简 prompt（>40 词触发） |
| `optimizeStyle` | enum | — | `auto` | `auto`/`realistic`/`anime`/`painting`/`scifi`/`portrait` |
| `enhance` | boolean | — | `false` | Pollinations LLM 扩写（不推荐） |
| `safe` | boolean | — | `false` | 内容过滤 |
| `noTextConstraint` | boolean | — | `true` | 默认追加 no-text/no-logo/no-watermark 约束；生成 UI、海报、文字内容或与屏幕场景冲突时可关闭 |
| `outputPath` | string | — | `./vision-output` | 存盘目录 |
| `fileName` | string | — | auto | 文件名（不含扩展名） |
| `format` | enum | — | `png` | `png`/`jpeg`/`jpg`/`webp`（处理变体恒为 PNG） |
| `compress` | boolean | — | `true` | PNG 压缩（其他格式跳过） |

### 后处理参数（生成后应用，原始图始终保留）

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `denoise` | boolean | `false` | 是否降噪（默认关闭；噪点明显时显式开启） |
| `denoiseMethod` | enum | `median` | `median`=sharp 快零依赖；`neural`=ONNX 高质量慢（需 `DENOISE_MODEL_PATH`，否则回退 median） |
| `denoiseRadius` | number | `1` | median 半径（1=轻度，2=更强更柔），仅 median |
| `sharpen` | boolean | `false` | unsharp mask 锐化 |
| `enhanceContrast` | boolean | `false` | CLAHE 局部对比度 |
| `removeBackground` | boolean | `false` | ONNX 抠图→透明 PNG；素材关键词自动开启：asset/icon/sprite/item/weapon/sword/shield/inventory/素材/图标/道具/武器/装备 等；英文按 token 匹配避免 iconic/bionic 等误触发；显式传值优先 |
| `realEsrgan` | boolean | `true` | 默认对生成图做增强 |
| `enhanceBackend` | enum | `auto` | `auto`/`realesrgan`/`sharp`/`none` |
| `enhanceFallback` | enum | `sharp` | Real-ESRGAN 不可用时默认 sharp CPU 兜底 |
| `realEsrganModel` | enum | `auto` | 生成图增强用 Real-ESRGAN 模型；`auto` 默认使用 `realesr-animevideov3`，显式模型值优先 |
| `realEsrganScale` | enum | `2` | 增强倍率 `2`/`3`/`4` |
| `realEsrganAutoDownload` | boolean | `true` | 支持平台下自动下载 Real-ESRGAN 二进制 |
| `realEsrganTimeoutMs` | number | `120000` | Real-ESRGAN 超时 |
| `returnMode` | enum | `path` | `path`=只返回本地路径；`binary`=图片二进制 + 最小 final path 文本；`both`=图片二进制 + 完整路径/元数据文本 |

**默认行为：** 生成原始图后默认跳过 clarity（`denoise=false`，`sharpen=false`，`enhanceContrast=false`），直接执行 `enhanceBackend='auto'` 增强：优先 Real-ESRGAN，当前环境支持但缺少二进制时自动下载；不支持、Vulkan 不可用或运行失败时默认使用 sharp CPU fallback。只有显式开启 `denoise`、`sharpen` 或 `enhanceContrast` 时才会产出 `_processed.png`。之后按显式参数或关键词自动执行 `removeBackground`，最后 `compress=true` 压缩 PNG。响应默认只返回本地路径；传 `returnMode: 'binary'` 或 `'both'` 返回图片内容。

**`realEsrganModel='auto'` 映射：** 生成图增强默认 → `realesr-animevideov3`。显式传 `realesrgan-x4plus` 或 `realesrgan-x4plus-anime` 会覆盖自动选择；只有明确需要这两个模型时才建议手动传入。

**默认 no-text 约束：** 生成 prompt 默认会追加 `No text, no letters, no words, no readable signs, no logos, no watermark.`。传 `noTextConstraint: false` 可关闭，适合海报文字、UI 截图、标牌、logo 或屏幕/代码场景冲突时使用。

**prompt 质量建议：** 复杂画面应减少同时出现的元素。优先一个主体、一个构图、一个氛围；开发者/工位图建议使用 blurred screens、abstract UI shapes，避免 detailed code、many monitors 和过多桌面道具。

**透明背景建议：** 质量优先时不要让生成模型直接画 `transparent background`；建议 prompt 写 plain white background，再传 `removeBackground: true` 由本地抠图生成透明 PNG。

## generateImageUrl

仅生成可分享 URL，不下载不存盘，无后处理。参数同 generateImage 生成参数，但无 outputPath/fileName/format/compress 及后处理参数。和 generateImage 一样会追加默认 no-text 约束。

## listImageModels

无参数。返回内置模型常量表。

## listTextModels

无参数。返回免费文本模型列表。
