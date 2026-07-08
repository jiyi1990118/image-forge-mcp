---
title: 预设对照表
category: reference
updated: 2026-07-07
---

# 预设对照表

## Prompt 优化风格预设（optimizeStyle）

控制 `optimizePrompt` 和 `generateImage(autoOptimize)` 的精简策略。这是项目目前唯一的"预设"体系。

| 预设 | 精简策略 | 保留 | 删除 | 示例 |
|---|---|---|---|---|
| `auto` | 自动检测 prompt 内容 | — | — | 按关键词匹配分类 |
| `realistic` | 保留材质/光照词 | 材质、光照、质量词 | 重复修饰 | "giant mech, explosions, cinematic" |
| `anime` | 保留角色特征 | 角色特征、画风 | 背景细节 | "anime girl, white dress, sakura" |
| `painting` | 保留画风+主体 | 画风、主体 | 物理描述 | "ink painting, steel city, panoramic" |
| `scifi` | 保留核心技术词 | 核心技术词 | 叙事 | "AI war, giant robots, plasma, epic" |
| `portrait` | 保留主体+氛围 | 主体、氛围 | 环境 | "asian girl, sunrise, soft light" |

> **已移除**：旧版有独立的 `removeBackground` / `convertImage` 工具与 `enhanceImage` 后处理预设体系（vivid/natural/portrait/...，含 sharpen/saturation/contrast/brightness/tint/enhanceEdges 参数）。背景抠图、清晰度处理和生成图增强现在作为 `generateImage` 的参数（`denoise`/`sharpen`/`enhanceContrast`/`removeBackground`/`realEsrgan`/`enhanceBackend`），预设概念已移除。`enhanceImage` 仍是独立 Real-ESRGAN 高清化工具，只处理已有本地图片。
