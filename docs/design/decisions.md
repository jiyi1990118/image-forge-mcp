---
title: 关键技术决策记录
category: design
updated: 2026-07-03
---

# 关键技术决策记录

## D1: 语言选型 — TypeScript

**决策：** TypeScript ESM

**理由：** MCP SDK 原生 TypeScript 支持，类型安全；工具 schema 自文档化。

**代价：** 需 tsc 构建步骤（`npm run build`）

## D2: 图像处理实现 — sharp + 可选 Real-ESRGAN

**决策：** 使用 sharp 库（libvips）做清晰度处理、压缩和 CPU fallback；使用可选 Real-ESRGAN ncnn-vulkan 做默认生成图增强和已有图片高清化。

**理由：** 基础部署只需 `npm install` + `npm run build`；sharp 性能高且能在 Real-ESRGAN/Vulkan 不可用时兜底。支持平台可自动下载 Real-ESRGAN 以提升生成图输出质量。

**代价：** Real-ESRGAN 依赖外部二进制和 Vulkan-capable GPU/driver；不支持或失败时生成图默认退回 sharp CPU resize。

## D3: 后处理合并进 generateImage — 不做独立工具

**决策：** 降噪/锐化/对比度/抠图作为 `generateImage` 参数，移除独立的 `removeBackground`/`convertImage` 工具

**理由：**
- 生成后处理是高频组合流程，合并为单工具减少 agent 工具选择负担
- 原始图 + 处理变体同一次调用产出，无需串联
- 抠图通过关键词自动触发，进一步降低调用复杂度

**代价：** `generateImage` 后处理仅处理本工具生成的图；已有本地图片可通过 `enhanceImage` 做 Real-ESRGAN 高清化，并可选在高清化后抠图。

## D4: 降噪双方案 — median 默认方法 + neural 可选

**决策：** `denoiseMethod`: `median`（sharp，默认）| `neural`（ONNX，可选）

**理由：**
- median 零依赖、ms 级，适合用户显式开启降噪时作为默认方法
- neural 复用项目已有的 onnxruntime-node（@imgly 依赖），无新运行时二进制；高质量但每图数秒，适合素材精修
- neural 需 `DENOISE_MODEL_PATH` 指向 DnCNN ONNX 模型，未设置则自动回退 median——保证默认流程不阻塞

**已否决：** waifu2x（需外部二进制 waifu2x-ncnn-vulkan 或臃肿的 npm 包含 ffmpeg；项目选择 Real-ESRGAN + sharp fallback）。

## D5: clarity 默认关闭，生成图默认增强

**决策：** clarity 层 `denoise`/`sharpen`/`enhanceContrast` 默认 false；`removeBackground` 默认 false，但命中素材类关键词时自动开启。生成图增强默认开启：`realEsrgan=true` 且 `enhanceBackend='auto'`，优先 Real-ESRGAN，失败时用 sharp fallback。

**理由：** AI 生成图的噪声、屏幕 UI 细节和霓虹纹理容易被前置降噪/锐化误处理，尤其在插画和赛博风场景中会产生颗粒或细节损失；因此 clarity 全部留 opt-in。素材类图像通常需要透明背景，因此关键词自动触发抠图。生成图默认增强用于补偿免费版 768px 原始输出，Real-ESRGAN 不可用时 sharp fallback 保证流程不中断。

## D6: removeBackground 关键词自动触发

**决策：** prompt 含 asset/icon/sprite/item/weapon/sword/shield/inventory/素材/图标/道具/武器/装备 等素材关键词时自动开启抠图；英文按 token 匹配以避免子串误触发；texture 不再自动开启；显式传值优先

**理由：** 游戏/素材场景几乎都需要透明背景，自动触发减少 agent 决策成本；显式参数保证可覆盖。

## D7: enhance 默认 false

**决策：** Pollinations `enhance` 参数默认 false

**理由：** 免费版 enhance=true 用 LLM 扩写 prompt，反而更糟。

## D8: 模型列表内置常量表

**决策：** `listImageModels` 返回内置常量表，不调 API

**理由：** `GET /models` 端点返回不全（只返回 sana），不可靠。内置 12 个实测可用 + 3 个不可用标注。

## D9: prompt 精简三层防线

**决策：** description 引导 + MCP prompt 模板 + optimizePrompt 工具

**理由：** 单一方案不可靠，三层组合覆盖不同场景。详见 `prompt-optimization.md`。

## D10: 图像处理用显式开关，不用预设

**决策：** 图像处理使用显式参数，不引入 preset 体系。clarity 使用 `denoise`/`sharpen`/`enhanceContrast`/`removeBackground`；生成图增强使用 `realEsrgan`、`enhanceBackend`、`enhanceFallback`、`realEsrganModel`、`realEsrganScale`、`realEsrganAutoDownload`、`realEsrganTimeoutMs`；响应模式用 `returnMode` 控制路径/图片内容。

**理由：** 旧版 16 档后处理预设难以预测。当前参数直接对应流水线阶段和后端选择，比预设表更清晰，也便于 agent 按需求只改一个行为。

## D11: 文档分类分目录

**决策：** docs/ 下分 architecture / guides / reference / design / examples 五个子目录

**理由：** 结构清晰，便于人工阅读和 agent 参考定位。

## D12: 项目名 image-forge-mcp

**决策：** 项目名 image-forge-mcp

**理由：** vision 涵盖图像生成+处理，简短易记。
