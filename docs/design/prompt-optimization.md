---
title: Prompt 精简优化方案设计
category: design
updated: 2026-07-03
---

# Prompt 精简优化方案设计

## 1. 问题背景

Pollinations 免费版文生图质量差的本质原因：

| 因素 | 表现 | 对 prompt 的影响 |
|---|---|---|
| 降采样到 768px | 请求多大都返回 768 | 细节多的 prompt 糊成一团 |
| 步数少 | 免费版推理步数受限 | 元素越多，每个元素渲染越差 |
| token 截断 | 超长 prompt 被截断 | 后半段元素丢失，画面不完整 |
| enhance 不可控 | enhance=true 用 LLM 扩写 | 反而让 prompt 更复杂更糟 |

**铁律：prompt 越精简、主体越少、质量越高。**

## 2. 三层防线组合方案

### 第一层：工具 description 引导（基线）

在 `generateImage` 工具的 description 里写明免费版限制和精简规则，让调用方 agent 在调用前自行精简。

- **可靠性：中** — 依赖 agent 自觉遵守
- **成本：零** — 改 description 即可
- **作用：基线提示，对遵守规则的 agent 有效**

### 第二层：MCP Prompt 模板（协议原生）

MCP 协议支持 `prompts` 概念——预定义的 prompt 模板，agent 可主动调用拉取精简指南。

```
MCP 暴露 prompt: "image-prompt-guide"
  ↓ agent 在对话开始时主动拉取
  ↓ 获取"如何为免费版写好 prompt"的规则
  ↓ 按规则精简后调 generateImage
```

- **可靠性：中高** — 比纯 description 强
- **成本：零** — 协议原生支持
- **作用：agent 可主动获取优化策略**

### 第三层：optimizePrompt 工具（强制精简，最可靠）

把"精简 prompt"做成一个真正的工具，调用 Pollinations 自己的免费 LLM（openai-fast）做二次精简。

```
用户/agent 调 optimizePrompt(rawPrompt, style)
  ↓ MCP 内部调 text.pollinations.ai/openai-fast
  ↓ system prompt: "压缩到 30 词以内, 保留主体, 去冗余"
  ↓ 返回精简后的 prompt + 原文 + 压缩比
  ↓ agent 再用精简 prompt 调 generateImage
```

- **可靠性：高** — 工具化=强制执行，不靠 agent 自觉
- **成本：多一次 LLM 调用（~2 秒，免费）**
- **作用：保证传入 generateImage 的 prompt 始终是优化过的**

## 3. 风格预设设计

精简策略不能一刀切，不同风格的"好 prompt"标准不同。

| 风格 preset | 精简策略 | 示例 |
|---|---|---|
| `realistic` | 保留材质/光照词，删重复修饰 | "giant mech, explosions, cinematic" |
| `anime` | 保留角色特征，删背景细节 | "anime girl, white dress, sakura" |
| `painting` | 保留画风+主体，删物理描述 | "ink painting, steel city, panoramic" |
| `scifi` | 保留核心技术词，删叙事 | "AI war, giant robots, plasma, epic" |
| `portrait` | 保留主体+氛围，删环境 | "asian girl, sunrise, soft light" |
| `auto` | 自动检测 prompt 内容选择策略 | 按关键词匹配分类 |

## 4. system prompt 设计

```
You are a prompt optimizer for Pollinations free-tier image generation.
The free tier downsamples to 768px with limited steps, so complex prompts
produce worse results. Your job: compress the prompt to under {targetWords} words
while preserving the MAIN subject and ONE key atmosphere descriptor.

Remove: redundant adjectives, excessive scene elements, contradictory terms,
redundant quality descriptors (keep only one "8k" or "masterpiece").

Keep: main subject, one lighting/mood word, one quality word.

Style preset: {style}
- realistic: keep material/lighting words, remove redundant modifiers
- anime: keep character traits, remove background details
- painting: keep art style + subject, remove physical descriptions
- scifi: keep core tech words, remove narrative
- portrait: keep subject + atmosphere, remove environment

Return ONLY the optimized prompt, nothing else. No explanation.
```

## 5. generateImage 集成

`generateImage` 内置 `autoOptimize` 参数（默认 true）：

```
autoOptimize=true (默认):
  1. 检测 prompt 长度
  2. 若 > 40 词，自动调 optimizePrompt 精简
  3. 若 ≤ 40 词，直接使用
  4. 返回结果中包含 "optimizedFrom" 字段标注是否精简过

autoOptimize=false:
  1. 直接使用原始 prompt
```

`optimizeStyle` 参数（默认 auto）控制精简策略，共 6 个选项：auto + 5 种风格。

## 6. 扩展预留

| 扩展点 | 当前 | 未来 |
|---|---|---|
| 风格预设 | 5 种 + auto | 配置文件加载自定义预设 |
| system prompt | 内置 | `customSystemPrompt` 参数覆盖 |
| targetWords | 30 默认 | 按 model 动态调整 |
| 精简引擎 | Pollinations openai-fast | 可选其他 LLM |
