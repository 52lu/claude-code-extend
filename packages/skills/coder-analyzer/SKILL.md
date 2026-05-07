---
name: coder-analyzer
description: Use when analyzing source code logic, tracing call chains from entry point to response, or generating structured documentation with Mermaid diagrams. Triggers on requests to analyze functions, trace API implementations,梳理调用链路, generate code review reports, or produce Obsidian-flavored docs from Go codebases.
---

# Coder Analyzer

从指定入口函数递归追踪调用链路，生成包含 Mermaid 图表的结构化 Obsidian 文档。

## When to Use

- 分析 API 接口的完整实现逻辑（从 Request 到 Response）
- 理解复杂业务流程的调用链路和模块依赖
- 生成技术文档、代码审查报告
- 梳理外部系统调用关系并生成 HTTP REST 文件

## When NOT to Use

- 只需查看单个函数定义（直接 Read 文件即可）
- 非 Go 语言项目的代码分析（当前模式仅针对 Go）
- 项目结构概览（使用 Explore agent）

## Quick Reference

| 步骤 | 工具 | 产出 |
|------|------|------|
| 1. 接收入口 | Read | 确认文件路径+行号/函数名 |
| 2. 静态扫描 | Read + Grep | 调用树 |
| 3. 提取逻辑 | Read + references/analysis-patterns.md | 关键代码片段 |
| 4. 生成图表 | references/output-template.md | Mermaid 图 |
| 5. 写文档 | Write | Obsidian Markdown |
| 6. 画流程图 | **REQUIRED SUB-SKILL:** json-canvas | .canvas 文件 |
| 7. HTTP 文件 | Write | .http 文件 |

## 工作流程

### Step 1: 接收分析任务

用户提供：
- **入口信息**：文件路径 + 行号/函数名（必须，缺失则询问用户）
- **关注点**（可选）：校验逻辑、状态流转、核心业务、异常处理等
- **输出路径**（可选）：未指定则保存到 `~/Documents/notes/4.AIOutput/`

### Step 2: 静态代码扫描

1. **读取入口函数** — 用 Read 定位到指定行号
2. **识别函数调用** — 提取方法调用，Grep 查找定义位置，区分内部 vs 第三方
3. **递归扫描** — 对内部调用重复 1-2，限制深度 5 层
4. **构建调用树** — 记录每层调用的文件路径和行号

### Step 3: 提取关键逻辑

按 `references/analysis-patterns.md` 中的模式识别规则提取：校验逻辑、状态流转、事务处理、错误处理。代码片段标注 `file_path:line_number`。

### Step 4: 生成 Mermaid 图表

按 `references/output-template.md` 选择图表类型：时序图（多服务调用）、流程图（条件分支）、状态图（状态流转）。节点数 <= 15，突出关键路径。

### Step 5: 编写文档

输出格式参考 `references/output-template.md`，包含：API 分析标题、业务流程图、核心逻辑说明、实现亮点与潜在风险。

### Step 6: 生成流程图

使用 **REQUIRED SUB-SKILL:** json-canvas 将流程图转为 Obsidian 格式保存。

### Step 7: 生成 HTTP REST 文件

- 位置：`.rest/oddapi/`，命名 `序号.功能名称.http`（序号递增不冲突）
- 包含：业务 API 接口 + 外部系统接口
- 外部接口变量需先声明，如 `@otherserver=xx`
- 每个接口只生成一个请求，不按入参重复
- 扫描模式：HTTP 客户端 `client.Get/Post`、gRPC 调用、第三方 SDK 调用

### Step 8: 保存文档

按用户指定路径保存，未指定则保存到 `~/Documents/notes/4.AIOutput/`。

## 分析深度控制

| Level | 深度 | 适用场景 |
|-------|------|---------|
| 1（默认） | 主流程 + 2 层子调用 | 快速理解整体流程 |
| 2 | 主流程 + 4 层子调用 | 详细分析关键模块 |
| 3 | 建议分多次分析 | 极端复杂场景 |

## Example

用户输入：`分析 service/odd/odd.go 第 271 行的 CreateOddTask 函数，关注点：校验逻辑、状态流转`

产出文档包含：API 分析标题及路径、Mermaid 时序图展示调用链路、核心逻辑（参数校验 + 任务创建）的代码片段及说明、亮点与风险分析。详见 `references/output-template.md`。

## Common Mistakes

| 错误 | 正确做法 |
|------|---------|
| 用户未提供入口函数就往下执行 | 必须先询问确认 |
| Mermaid 图节点过多（>15） | 突出关键路径，次要逻辑省略 |
| 包含第三方库调用细节 | 跳过第三方，只追踪内部调用 |
| 递归过深导致输出过长 | 限制 5 层，超出的用 "..." 省略 |
| HTTP 文件按入参重复生成多个 | 每个接口只生成一个请求 |
