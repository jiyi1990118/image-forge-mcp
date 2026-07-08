---
title: 文档索引
category: index
updated: 2026-07-03
---

# image-forge-mcp 文档索引

> 本文档为导航入口，按用途分类。人工阅读和 agent 参考均可从此定位。

## 快速定位

| 我想... | 去哪看 |
|---|---|
| 安装部署 | [guides/installation.md](guides/installation.md) |
| 快速上手 | [guides/quickstart.md](guides/quickstart.md) |
| 配置 MCP 客户端 | [guides/mcp-config.md](guides/mcp-config.md) |
| 查工具参数 | [reference/tools.md](reference/tools.md) |
| 查可用模型 | [reference/models.md](reference/models.md) |
| 查 prompt 优化风格 | [reference/presets.md](reference/presets.md) |
| 查环境变量 | [reference/env-vars.md](reference/env-vars.md) |
| 理解架构 | [architecture/overview.md](architecture/overview.md) |
| 理解工具设计 | [architecture/tool-design.md](architecture/tool-design.md) |
| 看设计决策 | [design/decisions.md](design/decisions.md) |
| 看示例 | [examples/](examples/) |

## 目录结构

```
docs/
├── README.md            ← 本文件 (索引)
├── architecture/        ← 架构文档 (开发者)
│   ├── overview.md         整体架构+数据流
│   ├── tool-design.md      7个工具设计详解
│   └── layer-diagram.md    分层职责说明
├── guides/              ← 使用指南 (用户+agent)
│   ├── installation.md     安装配置
│   ├── quickstart.md       5分钟上手
│   ├── mcp-config.md       客户端配置示例
│   └── faq.md              常见问题
├── reference/           ← API参考 (agent查询)
│   ├── tools.md            全部工具参数详解
│   ├── models.md           可用模型列表+状态
│   ├── presets.md          prompt 优化风格/optimizeStyle 对照表
│   └── env-vars.md         环境变量配置项
├── design/              ← 设计文档 (维护者)
│   ├── decisions.md        关键技术决策
│   ├── pollinations-analysis.md  免费版实测分析
│   └── prompt-optimization.md    prompt精简方案
└── examples/            ← 示例 (可执行)
    ├── postprocess.md       生成+后处理(降噪/锐化/抠图)
    ├── batch-variations.md  多seed批量生成
    └── optimize-styles.md   prompt优化风格对比
```

## agent 参考优先级

agent 查阅文档建议顺序：
1. `reference/tools.md` — 决定用哪个工具、传什么参数
2. `reference/models.md` — 选择模型
3. `reference/presets.md` — 选择 prompt 优化风格 (`optimizeStyle`)
4. `guides/quickstart.md` — 理解使用模式
5. `design/pollinations-analysis.md` — 理解免费版限制
