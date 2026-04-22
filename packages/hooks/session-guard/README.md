# session-guard

Claude Code 会话守护 hook —— 启动时检查是否复用上次会话，结束时更新会话记录。

监听 `SessionStart` 和 `Stop` 两个事件，通过 `current-session.json` 文件实现跨会话的上下文保持。

## 文件说明

| 文件 | 职责 |
|------|------|
| `hook.sh` | 主入口，转发 stdin JSON 给 Python 脚本 |
| `session_guard.py` | 核心逻辑：检测会话文件、交互式 y/n 询问、创建/更新会话记录 |

## 交互效果

当用户启动 Claude Code 时，如果当前目录存在 `current-session.json`，session-guard 通过 `additionalContext` 注入上下文，Claude 会主动询问用户：

```
Claude: 检测到当前目录存在上次的会话记录（已完成）：
  - 上次提问: 修复登录页面跳转 bug
  - 上次回复摘要: 已修复登录页面的路由跳转逻辑...
  - 时间: 2026-04-22 22:13:00
  - 已恢复次数: 2 次

  是否继续上次的对话？如果继续，我将基于之前的上下文继续工作；如果不需要，我们将开始全新的对话。
```

用户回答"继续" → Claude 基于历史上下文恢复工作
用户回答"不需要" → 开始全新对话

## 流程图

```
┌──────────────────────────────────────────────────────────────────────┐
│              Claude Code 触发 Hook 事件                               │
│         (通过 stdin 传入 JSON: session_id, transcript_path, cwd...)  │
└───────────────────────────┬──────────────────────────────────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   hook.sh    │  转发 stdin → python3 session_guard.py
                     └──────┬───────┘
                            │
                            ▼
                  ┌──────────────────────┐
                  │  session_guard.py    │
                  │  读取 stdin JSON     │
                  │  判断 hook_event_name│
                  └──────┬───────────────┘
                         │
            ┌────────────┴────────────┐
            │                         │
            ▼                         ▼
   ┌─────────────────┐      ┌─────────────────┐
   │  SessionStart    │      │      Stop       │
   │                  │      │                 │
   └────────┬────────┘      └────────┬────────┘
            │                        │
            ▼                        ▼
   ┌─────────────────┐      ┌─────────────────┐
   │ current-session  │      │ current-session  │
   │  .json 存在？    │      │  更新会话记录    │
   └────┬───────┬────┘      └────────┬────────┘
        │       │                     │
   存在 ▼       ▼ 不存在              ▼
 ┌──────────┐ ┌──────────┐    ┌──────────────────┐
 │ 显示会话  │ │ 创建初始 │    │ 更新字段:         │
 │ 摘要卡片  │ │ 会话文件 │    │  timestamp        │
 │          │ │          │    │  last_user_message│
 │ y/n 询问  │ │ 从       │    │  last_assistant_  │
 │ 是否复用？│ │ transcript│    │    message        │
 │      │   │ │ 提取最后 │    │  status=completed │
 │  y ↙  ↘ n│ │ 用户消息 │    └──────────────────┘
 │ 注入      │ │          │
 │ additional│ │ 写入文件 │
 │ Context   │ └──────────┘
 │ Claude 继续│
 │ 之前的对话 │
 └──────────┘
```

## 脚本执行逻辑详解

### hook.sh — 主入口

极简入口，将 stdin 数据透传给 `session_guard.py`：

```
stdin JSON ──→ python3 session_guard.py ──→ stdout JSON (可选)
```

### session_guard.py — 核心逻辑

根据 `hook_event_name` 分两个处理路径：

#### SessionStart 路径

1. 检查 `current-session.json` 是否存在

**文件已存在 → 注入 additionalContext 让 Claude 询问用户**

1. 返回 `additionalContext`，Claude 收到后会在对话中询问用户是否继续
2. 用户回答"继续" → Claude 基于历史上下文恢复工作
3. 用户回答"不需要" → 开始全新对话

返回的 `additionalContext` 格式：

```json
{
  "additionalContext": "[session-guard] 用户选择继续之前的会话。上次提问: 修复登录 bug。上次回复摘要: 已修复登录页面...。请基于以上上下文继续对话，询问用户是否需要补充或调整方向。"
}
```

**文件不存在 → 创建初始会话文件**

从 transcript 提取用户最后消息，静默创建文件，不阻塞用户。

#### Stop 路径

1. 检查 `stop_hook_active`，防止无限循环
2. 从 transcript 提取用户最后消息，从 stdin 获取 `last_assistant_message`
3. 更新 `current-session.json`：

```json
{
  "timestamp": "2026-04-22 22:15:00",
  "working_directory": "~/projects/my-app",
  "session_id": "abc-123",
  "last_user_message": "修复登录 bug",
  "last_assistant_message": "已修复登录页面...",
  "status": "completed",
  "resume_count": 2
}
```

## current-session.json 生命周期

```
用户启动 Claude Code ──→ SessionStart ──→ 文件不存在 ──→ 静默创建初始文件
                                              │
用户再次启动 ──→ SessionStart ──→ 文件存在 ──→ 注入 additionalContext
                                              │
                                    Claude 询问用户是否继续
                                              │
                                    继续 ──→ 基于历史上下文恢复工作
                                    不需要 ──→ 全新对话
                                              │
         Claude 完成(Stop) ──→ 更新文件 status=completed
```

> 注意：当前实现不会自动删除 `current-session.json`，需手动清理或通过其他机制处理。

## settings.json 注册方式

session-guard 同时注册到两个事件：

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [{ "type": "command", "command": "bash ~/.claude-extend/hooks/session-guard/hook.sh" }]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [{ "type": "command", "command": "bash ~/.claude-extend/hooks/session-guard/hook.sh" }]
      }
    ]
  }
}
```

## 依赖

- `python3` — 核心逻辑
