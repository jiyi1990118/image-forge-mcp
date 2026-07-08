---
title: 多 seed 批量生成示例
category: examples
updated: 2026-07-03
---

# 多 seed 批量生成示例

## 需求

用同一提示词生成 3 张不同构图，挑选最佳。

## 调用（串行，避免 429 限流）

```
# 第1张
generateImage({
  prompt: "A serene mountain lake at sunrise, misty, cinematic",
  seed: 1001,
  autoOptimize: true
})

# 间隔 15 秒

# 第2张
generateImage({
  prompt: "A serene mountain lake at sunrise, misty, cinematic",
  seed: 2002,
  autoOptimize: true
})

# 间隔 15 秒

# 第3张
generateImage({
  prompt: "A serene mountain lake at sunrise, misty, cinematic",
  seed: 3003,
  autoOptimize: true
})
```

## 注意事项

- **必须串行**：免费版并发会触发 429 Too Many Requests
- **间隔 10-15 秒**：避免限流
- **同 prompt 不同 seed**：获得不同构图变体
- **同 prompt 同 seed**：返回同一张图（缓存）
- 挑选满意后可在该次 `generateImage` 调用中传 `sharpen=true`/`enhanceContrast=true` 做清晰度增强（不提升分辨率）
