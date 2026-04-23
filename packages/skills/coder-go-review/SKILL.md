---
name: coder-go-review
description: 审查 Golang 代码质量，对比分支改动，输出 Obsidian 格式的审查报告。用于：(1) 分支代码审查，对比当前分支与目标分支的改动；(2) 发现代码质量问题、最佳实践违反、架构设计缺陷；(3) 输出审查报告到 Obsidian notes 目录。触发关键词：代码审查、code review、审查代码、分支审查、代码质量检查。
---

# Golang Code Review

## Overview

审查 Golang 代码质量，对比分支改动，生成结构化的 Obsidian markdown 审查报告。

## Workflow Decision Tree

```
开始代码审查
    │
    ├─ 用户指定分支对比？
    │   ├─ 是 → 对比当前分支与指定分支的改动
    │   └─ 否 → 对比当前分支与 origin/feat-odd-master 的改动
    │
    ├─ 获取改动文件列表
    │   └─ git diff --name-status target_branch...HEAD
    │
    ├─ 分析阶段
    │   ├─ 读取项目编码规范（CLAUDE.md）
    │   ├─ 分析项目结构（service/logic/dao）
    │   └─ 理解业务上下文
    │
    ├─ 审查阶段
    │   ├─ 代码质量问题 → references/code-quality-checklist.md
    │   ├─ Golang 最佳实践 → references/golang-best-practices.md
    │   └─ 架构设计评估 → 分析模块划分、依赖关系、封装合理性
    │
    └─ 输出阶段
        ├─ 使用 obsidian-markdown skill 格式化报告
        ├─ 输出到 /Users/horizon/Documents/notes/
        └─ 文件命名：代码审查-YYYY-MM-DD-{branch-name}.md
```

## Step 1: 分析阶段

### 1.1 获取改动文件

```bash
# 获取目标分支（默认：origin/feat-odd-master）
TARGET_BRANCH=${1:-origin/feat-odd-master}

# 获取改动文件列表
git diff --name-status $TARGET_BRANCH...HEAD

# 获取详细改动内容
git diff $TARGET_BRANCH...HEAD
```

### 1.2 分析项目编码规范

读取项目根目录的 `CLAUDE.md` 文件，了解：
- 项目架构（微服务架构、层级结构）
- 编码规范（注释规范、命名规范）
- 技术栈（Gin、GORM、gRPC 等）
- 目录结构约定（service/logic/dao）

### 1.3 理解业务上下文

根据改动文件的位置和内容，理解：
- 改动所属模块（ODD、Task、Project 等）
- 改动类型（新增功能、bug 修复、重构等）
- 涉及的业务流程

## Step 2: 审查阶段

### 2.1 代码质量检查

检查以下质量问题：

**必查项**（参考 `references/code-quality-checklist.md`）：
- 空指针风险：所有指针使用前是否判空
- 错误处理：所有 error 是否正确处理
- 资源泄漏：goroutine、文件句柄、数据库连接是否正确关闭
- 并发安全：共享变量是否有竞态条件
- SQL 注入：是否使用参数化查询
- 边界检查：数组/切片访问是否检查边界

**输出格式**：
```markdown
### 代码质量问题

#### 1. 空指针风险
- **文件**: `logic/odd/odd.go:123`
- **问题**: `user.Name` 可能为空，未判空
- **建议**: 添加判空检查 `if user != nil && user.Name != ""`

#### 2. 错误处理缺失
- **文件**: `dao/odd/task.go:45`
- **问题**: 未处理 `db.Create()` 返回的 error
- **建议**: 添加错误处理逻辑
```

### 2.2 Golang 最佳实践

检查是否符合 Golang 最佳实践（参考 `references/golang-best-practices.md`）：

**检查项**：
- 命名规范：变量、函数、结构体命名是否符合 Go 惯例
- 注释规范：导出函数是否有注释，注释格式是否正确
- 错误处理：是否使用 `errors.Is()` 和 `errors.As()` 而非 `==`
- Context 传递：所有长时间运行的操作是否传递 context
- 接口设计：接口是否在消费者端定义
- 函数设计：函数是否单一职责，是否过长（建议 <50 行）

**输出格式**：
```markdown
### 最佳实践建议

#### 1. 注释规范
- **文件**: `logic/odd/odd.go:56`
- **问题**: 导出函数缺少注释
- **建议**: 添加函数注释，格式遵循 Go 规范

#### 2. 函数过长
- **文件**: `logic/odd/odd_label.go:234`
- **问题**: `ProcessLabel()` 函数超过 100 行，建议拆分
- **建议**: 拆分为多个子函数，每个函数单一职责
```

### 2.3 架构设计评估

分析代码的架构设计是否合理：

**评估维度**：
1. **层次结构**：是否符合 service → logic → dao 的分层架构
2. **模块划分**：模块边界是否清晰，职责是否单一
3. **依赖关系**：依赖方向是否正确（上层依赖下层）
4. **封装合理性**：是否存在过度封装或封装不足
   - 过度封装：简单的 CRUD 操作无需额外封装
   - 封装不足：复杂的业务逻辑应该封装到 logic 层
5. **代码复用**：是否有重复代码可以提取为公共函数

**输出格式**：
```markdown
### 架构设计建议

#### 1. 层次结构违反
- **文件**: `service/odd/odd.go:89`
- **问题**: service 层直接调用 dao 层，跳过了 logic 层
- **建议**: 在 logic 层添加业务逻辑处理

#### 2. 过度封装
- **文件**: `dao/odd/task.go:34`
- **问题**: `GetTaskByID()` 仅是对 `db.First()` 的简单封装
- **建议**: 可以直接在 logic 层调用 `dao.GetTaskByID()`，无需额外封装

#### 3. 代码复用
- **文件**: `logic/odd/odd.go:123`, `logic/odd/odd_label.go:456`
- **问题**: 两处代码存在相似的验证逻辑
- **建议**: 提取为公共函数 `validateOddData()`
```

## Step 3: 输出阶段

### 3.1 生成 Obsidian 报告

使用 `obsidian-markdown` skill 格式化报告，包含：

**报告结构**：
```markdown
# 代码审查报告 - {branch-name}

## 📋 基本信息
- **审查日期**: YYYY-MM-DD
- **当前分支**: {current-branch}
- **目标分支**: {target-branch}
- **改动文件数**: {count}

## 📂 改动文件列表
| 文件路径 | 改动类型 | 行数变化 |
|---------|---------|---------|
| ... | M/A/D | +50/-20 |

## ⚠️ 代码质量问题
[按严重程度排序：Critical > Major > Minor]

## 💡 最佳实践建议
[按优先级排序]

## 🏗️ 架构设计建议
[按影响范围排序]

## ✅ 优秀实践
[值得保留的设计和实现]

## 📊 审查总结
- **问题总数**: {count}
- **Critical**: {count}
- **Major**: {count}
- **Minor**: {count}
- **建议采纳率**: 预估 {percentage}%
```

### 3.2 输出文件

- **输出目录**: `/Users/horizon/Documents/notes/`
- **文件命名**: `代码审查-{YYYY-MM-DD}-{branch-name}.md`
- **示例**: `代码审查-2026-02-28-feat-odd-wind-up.md`

## Tips

1. **优先级排序**：Critical（会导致 crash、数据丢失）> Major（影响功能、性能）> Minor（代码风格、可读性）
2. **问题定位**：精确到文件路径和行号，便于开发者快速定位
3. **建议具体**：提供具体的代码示例，而非抽象的描述
4. **保持客观**：基于事实和规范，避免主观判断
5. **正向反馈**：不仅指出问题，也认可优秀的设计和实现

## Resources

- `references/code-quality-checklist.md`: 代码质量检查清单，包含常见问题和检查要点
- `references/golang-best-practices.md`: Golang 最佳实践参考，包含命名规范、错误处理、并发编程等
