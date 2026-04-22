# claude-code-extend

Claude Code hooks、agents 和工具脚本管理器。每个脚本独立安装，支持元数据驱动的发现和配置。

## 快速安装

```bash
# 一键安装所有脚本（符号链接方式，git pull 即更新）
git clone https://github.com/52lu/claude-code-extend.git
cd claude-code-extend
./scripts/install.sh
```

或通过 curl：
```bash
curl -fsSL https://raw.githubusercontent.com/52lu/claude-code-extend/main/scripts/install.sh | bash -s -- --repo /path/to/claude-code-extend
```

## 单脚本安装（npm）

```bash
npx claude-extend install task-completed-notify
```

## CLI 命令

```bash
claude-extend list                    # 列出可用脚本
claude-extend list --type hook        # 只列出 hooks
claude-extend install <name>          # 安装脚本
claude-extend uninstall <name>        # 卸载脚本
claude-extend installed               # 列出已安装脚本
claude-extend info <name>             # 查看脚本详情
```

## 可用脚本

| 名称 | 类型 | 事件 | 说明 |
|------|------|------|------|
| session-guard | hook | Notification, Stop | 会话守护：空闲时检查/创建会话文件，结束时更新记录 |
| task-completed-notify | hook | Stop | 任务完成时发送系统通知 |

## 添加新脚本

1. 在 `packages/<type>/<name>/` 下创建脚本文件
2. 在文件头部添加元数据注释：

```bash
#!/bin/bash
# @claude-extend
# @name my-new-hook
# @type hook
# @event PreToolUse
# @description 我的新 hook
# @version 0.1.0
```

3. 创建 `package.json`：
```json
{
  "name": "@claude-extend/hook-my-new-hook",
  "version": "0.1.0",
  "description": "My new hook"
}
```

4. 运行 `npm install` 注册到 workspaces
5. 提交代码

## 元数据字段

| 字段 | 必填 | 说明 |
|------|------|------|
| `@claude-extend` | 是 | 标记为 claude-extend 脚本 |
| `@name` | 是 | 唯一标识符 |
| `@type` | 是 | hook / agent / tool |
| `@event` | hook 必填 | 事件类型，逗号分隔多事件（如 `Notification,Stop`） |
| `@matcher` | 否 | 事件匹配器（如 `idle_prompt`），仅对首个事件生效 |
| `@description` | 是 | 描述 |
| `@dependencies` | 否 | 依赖的系统命令，逗号分隔 |
| `@version` | 是 | 语义化版本 |

## 安装目录

脚本安装到 `~/.claude-extend/`，不污染 `~/.claude/`：

```
~/.claude-extend/
├── hooks/
│   └── task-completed-notify/ -> /path/to/repo/packages/hooks/task-completed-notify/
├── agents/
└── tools/
```

## 开发

```bash
npm install          # 安装依赖
npm run build        # 构建 CLI
npm test             # 运行测试
```
