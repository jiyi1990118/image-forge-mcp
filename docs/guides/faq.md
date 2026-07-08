---
title: 常见问题
category: guides
updated: 2026-07-03
---

# 常见问题

## Q1: 生成的图片很模糊？

**原因：** Pollinations 免费版原始输出会降采样到 768px。

**解决：** `generateImage` 默认用 `enhanceBackend='auto'` 做本地增强：优先 Real-ESRGAN，不支持或失败时用 sharp CPU fallback。可显式加 `denoise=true`、`sharpen=true` 或 `enhanceContrast=true` 做额外 clarity 处理。如需更高质量原生输出，注册 enter.pollinations.ai 获取付费 token。

## Q2: 同一个 prompt 换了 model 结果一样？

**原因：** 免费版对相同 prompt+seed 返回缓存，忽略 model 参数。

**解决：** 换 seed 获得不同图。

## Q3: generateImage 默认产出哪些文件，返回什么？

默认会保留原始图 `<fileName>.<format>`，并产出 clarity/增强后的最终 PNG。响应默认是本地路径文本（`returnMode='path'`），不是图片内容；需要图片内容时传 `returnMode: 'binary'` 或 `'both'`。

## Q4: removeBackground 什么时候自动开启？

当 prompt 含 `asset/icon/sprite/item/weapon/sword/shield/inventory/素材/图标/道具/武器/装备` 等素材关键词时，`removeBackground` 自动开启，产出透明 PNG。英文按 token 匹配，避免 `iconic`、`bionic`、`endgame` 等误触发；`texture` 不再自动开启。显式传 `removeBackground: false` 可关闭自动行为；显式传 `true` 则无论关键词都开启。

## Q5: 神经降噪（denoiseMethod=neural）报错或没效果？

**原因：** 神经降噪需 `DENOISE_MODEL_PATH` 环境变量指向 DnCNN 类 ONNX 模型。未设置时自动回退 median（stderr 有告警）。

**解决：** 放置一个 DnCNN ONNX 模型并设置 `DENOISE_MODEL_PATH`，调用时传 `denoise=true`、`denoiseMethod='neural'`。无模型时可显式使用 `denoise=true` 的默认 median 方法。

## Q6: optimizePrompt 返回的 prompt 没变化

**原因：** 原始 prompt 已足够短（≤40 词），无需优化。这是正常行为。

## Q7: generateImage 返回 429 Too Many Requests

**原因：** 免费版有并发限制。

**解决：** 串行生成，每次间隔 10-15 秒。

## Q8: Real-ESRGAN 支持 Windows 集显吗？

**取决于 Vulkan 驱动。** `generateImage` 和 `enhanceImage` 使用 `realesrgan-ncnn-vulkan`。较新的 Intel UHD/Iris/Iris Xe 或 AMD 集显在官方驱动正常时通常可跑，但速度会慢。Windows 默认 Basic Display Adapter 或无 Vulkan 驱动会失败。`generateImage` 默认会回退到 sharp CPU fallback；`enhanceImage` 建议先用 `scale=2`。

## Q9: Real-ESRGAN 占多少空间？

首次自动下载当前平台 zip：Windows ~43MB、Linux ~45MB、macOS ~49MB；解压后通常 80-130MB，缓存于 `.cache/realesrgan/` 或 `REALESRGAN_CACHE_DIR`。可用 `REALESRGAN_PATH` 指向已有二进制跳过下载。

## Q10: 列表里为什么没有图生图/音频？

**原因：** 图生图（kontext/nanobanana/seedream）实测全 500，音频 404，均不可用。超分/增强能力由 `generateImage` 默认增强路径和独立 `enhanceImage` 提供，Real-ESRGAN 可选自动下载，失败时 `generateImage` 默认用 sharp CPU fallback。

## Q11: 可以用付费版获得更高质量吗？

**可以。** 注册 enter.pollinations.ai 获取 `sk_` 密钥，配置 `POLLINATIONS_TOKEN` 环境变量即可解锁原生高清。但本项目聚焦免费版能力。
