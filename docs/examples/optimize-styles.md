---
title: Prompt 优化风格对比
category: examples
updated: 2026-07-07
---

# Prompt 优化风格对比

## optimizeStyle（prompt 精简风格）

影响 `generateImage` 的 `autoOptimize` 和 `optimizePrompt` 的精简策略。这是项目唯一的"风格预设"体系。

| style | 精简策略 | 适合场景 |
|---|---|---|
| auto | 自动检测 | 通用（默认） |
| realistic | 保留材质/光照词 | 照片、写实 |
| anime | 保留角色特征 | 二次元、插画 |
| painting | 保留画风+主体 | 古画、艺术 |
| scifi | 保留核心技术词 | 科幻、机甲 |
| portrait | 保留主体+氛围 | 人像、唯美 |

## 组合推荐

| 场景 | optimizeStyle | 说明 |
|---|---|---|
| 赛博朋克城市 | scifi | 保留核心技术词，删叙事 |
| 古风人物画像 | portrait | 保留主体+氛围，删环境 |
| 樱花女孩写真 | portrait | 保留角色特征+柔光 |
| 机甲大战 | scifi | 保留技术词 |
| 清明上河图改版 | painting | 保留画风+主体 |
| 通用风景 | auto | 自动检测 |

## 示例调用

```
optimizePrompt({
  prompt: "A majestic cyberpunk city at night with neon lights, rain, flying cars, holographic billboards, cinematic, ultra detailed, 8k, volumetric lighting",
  style: "scifi",
  targetWords: 20
})
```

返回精简后的 prompt（保留核心技术词，删除冗余修饰）。

> **已移除**：旧版有 `enhanceImage` 的后处理 preset 体系（vivid/natural/portrait/...）。图像处理改用 `generateImage` 的显式参数（`denoise`/`sharpen`/`enhanceContrast`/`realEsrgan`/`enhanceBackend`），预设概念已移除。`enhanceImage` 仍是独立 Real-ESRGAN 高清化工具，只处理已有本地图片。
