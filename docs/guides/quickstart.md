---
title: 5 分钟快速上手
category: guides
updated: 2026-07-03
---

# 5 分钟快速上手

## 场景 1：生成一张图（默认增强，返回路径）

```
用户：帮我画一只赛博朋克风格的猫
```

agent 会调用 `generateImage`：
- `autoOptimize=true` 自动精简 prompt
- `denoise=false`（默认）不做降噪，避免放大生成图伪影；需要时显式开启
- `enhanceBackend='auto'` 默认增强：优先 Real-ESRGAN，失败用 sharp CPU fallback
- 默认返回本地路径；需要图片内容时传 `returnMode: 'binary'` 或 `'both'`

## 场景 2：生成并锐化/增强对比度

```
用户：画一张风景图，锐化一下，对比度增强
```

agent 会调用 `generateImage`：
- 传 `sharpen=true`、`enhanceContrast=true`
- 降噪默认关闭；如需同时降噪，显式传 `denoise=true`。锐化+CLAHE 后仍会执行默认增强
- 产出原始图、clarity `_processed.png` 中间文件和最终增强 PNG 路径

## 场景 3：生成游戏素材图标（自动抠图）

```
用户：生成一个游戏道具图标，宝剑
```

agent 会调用 `generateImage`：
- prompt 含"游戏道具"关键词 → `removeBackground` 自动开启
- 默认增强后再产出透明 PNG
- 首次抠图需下载 ~170MB 模型

## 场景 4：神经降噪（高质量，需模型）

```
用户：用神经降噪生成一张图
```

agent 会调用 `generateImage`：
- 传 `denoiseMethod='neural'`
- 传 `denoise=true`
- 需设置 `DENOISE_MODEL_PATH` 指向 DnCNN ONNX 模型；未设置则自动回退 median 并告警

## 场景 5：只优化 prompt 不生图

```
用户：帮我把这段 prompt 优化精简一下：一大段冗长描述...
```

agent 会调用 `optimizePrompt`（独立工具）。

## 场景 6：多 seed 变体

```
用户：用同一个提示词生成 3 张不同的图
```

agent 会调用 3 次 `generateImage`，用不同 seed。

## 场景 7：文本问答

```
用户：用 image-forge-mcp 的文本功能解释一下量子计算
```

agent 会调用 `respondText`（免费 openai-fast 模型）。

## 关键提示

- **prompt 越简单越好**：免费版奖励简单 prompt（一个主体+一个氛围词）
- **autoOptimize 默认开启**：长 prompt 会被自动精简，设 `autoOptimize=false` 可关闭
- **换 seed 换图**：同 prompt 同 seed 返回同一张图，换 seed 获得变体
- **默认增强**：每次生成默认保留原始图，并产出本地增强后的最终 PNG 路径；只有开启 `denoise`、`sharpen` 或 `enhanceContrast` 时才会产出 clarity `_processed.png` 中间文件；Real-ESRGAN 不可用时用 sharp CPU fallback
- **文字约束**：`noTextConstraint=true` 默认减少假文字、logo、水印；生成 UI 截图、海报或屏幕代码氛围图时可设为 `false`
- **复杂场景**：优先一个主体、一个构图、一个氛围。开发者场景用 blurred screens / abstract UI shapes，不要堆太多显示器、代码和桌面道具
- **默认路径响应**：`generateImage` 默认只返回文本路径；传 `returnMode: 'binary'` 或 `'both'` 才返回图片内容
- **接受 768px 原始输出**：免费版原始图降采样到 768px，随后本地增强/放大
