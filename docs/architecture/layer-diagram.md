---
title: 分层职责说明
category: architecture
updated: 2026-07-07
---

# 分层职责说明

## 分层架构图

```
┌─────────────────────────────────────────────┐
│  MCP Client (opencode/Claude/Cursor)         │
└───────────────────┬─────────────────────────┘
                    │ JSON-RPC over stdio
┌───────────────────▼─────────────────────────┐
│  入口层  index.ts / server.ts                │
│  - MCP Server 实例                           │
│  - 工具注册 + prompt 模板注册                │
│  - 请求路由                                  │
└───────────────────┬─────────────────────────┘
                    │
┌───────────────────▼─────────────────────────┐
│  Schema 层  schemas/                         │
│  - 7 个工具的 inputSchema + description      │
│  - 类型定义 (与 types/ 对应)                 │
└───────────────────┬─────────────────────────┘
                    │
┌───────────────────▼─────────────────────────┐
│  工具层  tools/                              │
│  - 4 个 handler 文件 (generateImage/         │
│    enhanceImage/optimizePrompt/textTools)    │
│  - 参数校验 + 默认值合并                     │
│  - 调用 service 层                           │
│  - 组装 MCP 响应 (content array)             │
└──────┬────────────┬───────────┬─────────────┘
       │            │           │
┌──────▼───┐ ┌──────▼────┐ ┌───▼────────────┐
│ services/ │ │ services/  │ │ services/      │
│ pollinat. │ │ enhance/   │ │ optimizer/     │
│ - image   │ │ - clarity  │ │ - promptOptim  │
│ - text    │ │ - denoise  │ │ - stylePresets │
│ - client  │ │ - bgRemove │ │                │
│           │ │ - compress │ │                │
└──────┬───┘ └──────┬────┘ └───┬────────────┘
       │            │           │
       │     ┌──────▼────┐      │
       │     │ services/  │      │
       │     │ upscale/   │      │
       │     │ - Real-    │      │
       │     │   ESRGAN   │      │
       │     └───────────┘      │
       │            │           │
       │     ┌──────▼────┐      │
       │     │ ONNX 运行时│      │
       │     │ (抠图@imgly│      │
       │     │  +神经降噪 │      │
       │     │  复用)     │      │
       │     └───────────┘      │
       │                        │
┌──────▼────────────────────────▼─────────────┐
│  配置层  config/                             │
│  - constants.ts (env 默认值)                 │
│  - defaults.ts (getDefaults 辅助)            │
│  - models.ts (模型注册表常量)                │
└─────────────────────────────────────────────┘
```

## 各层职责

### 入口层 (`index.ts` / `server.ts`)
- 创建 MCP Server 实例
- 注册 7 个工具 + 1 个 prompt 模板
- 处理 `ListToolsRequest` / `CallToolRequest` / `ListPromptsRequest`
- 启动 StdioServerTransport

### Schema 层 (`schemas/`)
- 纯数据定义，无逻辑
- 每个工具的 name / description / inputSchema
- description 是 agent 选择工具的唯一依据，需高命中率

### 工具层 (`tools/`)
- 4 个 handler 文件：`generateImage.ts`（含后处理流程 + 关键词检测 + 默认 no-text 约束）、`enhanceImage.ts`、`optimizePrompt.ts`、`textTools.ts`
- 接收 CallToolRequest，提取参数
- 合并 env 默认值
- 调用对应 service
- 把 service 返回的数据组装成 MCP content 数组
- 错误捕获 → `{ isError: true, content: [说明] }`

### 服务层 (`services/`)
- `pollinations/`：纯 API 调用，无 MCP 依赖
- `enhance/`：`clarityService`（median/neural 降噪 + CLAHE + sharpen 流水线）、`denoiseService`（ONNX 神经降噪，无模型时回退 median）、`backgroundRemovalService`（@imgly ONNX 抠图）、`compressService`（pngquant/zopfli 压缩）
- `upscale/`：`realesrganService`（自动下载/缓存 Real-ESRGAN ncnn-vulkan，alpha-safe 处理，spawn 子进程）
- `optimizer/`：调 Pollinations LLM 精简 prompt

### 配置层 (`config/`)
- 所有可配置项集中
- 模型注册表（内置常量）
- 可从环境变量覆盖

## 依赖方向

```
入口 → Schema → 工具 → 服务 → 配置/工具函数
                                    ↑
                               类型定义贯穿所有层
```

**规则：** 上层依赖下层，下层不反向依赖上层。服务层不导入工具层代码。
