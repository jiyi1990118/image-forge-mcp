---
title: 生成 + 后处理示例
category: examples
updated: 2026-07-03
---

# 生成 + 后处理示例

## 需求

生成一张赛博朋克城市图，做降噪 + 锐化 + 对比度增强。

## 调用

```
generateImage({
  prompt: "A cyberpunk city at night, neon lights, rain, flying cars",
  seed: 12345,
  denoise: true,          // 默认关闭；这里显式开启 median 降噪
  sharpen: true,          // 叠加锐化
  enhanceContrast: true,  // CLAHE 对比度
  returnMode: "path",     // 默认，只返回本地路径
  compress: true
})
```

### 执行流程

```
1. autoOptimize 精简 prompt（>40 词时）
2. Pollinations 生图 (768px) → 存原始 cyberpunk_city.png
3. clarity 流水线 → 存 cyberpunk_city_processed.png
   ├─ median(1) 降噪
   ├─ clahe 对比度增强
   └─ sharpen 锐化
4. 默认增强 → 优先 Real-ESRGAN，失败用 sharp CPU fallback → 存 cyberpunk_city_enhanced.png
5. pngquant+zopfli 压缩
```

### 返回

默认返回文本路径和元数据；传 `returnMode: "binary"` 或 `"both"` 时才返回图片内容。文本含：
```
Raw image saved to: /.../cyberpunk_city.png
Processed image saved to: /.../cyberpunk_city_processed.png
Enhanced image saved to: /.../cyberpunk_city_enhanced.png
Final image saved to: /.../cyberpunk_city_enhanced.png
Clarity: denoise:median(r=1) + clahe + sharpen
Enhancement: Enhanced with Real-ESRGAN (...) 或 Real-ESRGAN unavailable; used sharp CPU fallback
Compression: 1.2 MB -> 380 KB
```

## 变体：游戏道具抠图（关键词自动触发）

```
generateImage({
  prompt: "a game item icon: a glowing magic sword"
})
```

prompt 含 `game`/`item`/`icon` → `removeBackground` 自动开启，增强后再产出透明 PNG（首次抠图下载 ~170MB 模型）。

## 变体：神经降噪（需模型）

```
generateImage({
  prompt: "...",
  denoise: true,
  denoiseMethod: "neural"
})
```

需 `DENOISE_MODEL_PATH` 指向 DnCNN ONNX 模型；未设置则回退 median 并 stderr 告警。

> **注意**：Pollinations 免费版原始输出会降采样到 768px；`generateImage` 默认会在本地用 Real-ESRGAN 或 sharp fallback 做增强/放大。降噪/锐化/对比度只改善画面质感。

## 变体：复杂开发者场景

生成前端工程师、工作站、屏幕 UI 等复杂画面时，优先简化 prompt：

```
generateImage({
  prompt: "anime half-body portrait of a senior frontend engineer, laptop glow, blurred developer studio background, abstract UI shapes, blue purple lighting",
  autoOptimize: false,
  noTextConstraint: false,
  denoise: false,
  sharpen: false
})
```

建议用 `blurred screens`、`abstract UI shapes` 表达职业氛围，避免同时要求 detailed code、many monitors、keyboard、mouse、coffee cup 等过多元素。
