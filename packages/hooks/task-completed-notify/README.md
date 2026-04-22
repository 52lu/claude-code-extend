# task-completed-notify

Claude Code `Stop` 事件 hook —— 任务完成时发送系统通知。

> 会话信息保存功能已迁移到 [session-guard](../session-guard/) hook。

## 文件说明

| 文件 | 职责 |
|------|------|
| `hook.sh` | 主入口，编排整个通知流程 |
| `parse_hook.py` | 解析 stdin JSON，提取 session_id 和用户最后一条消息 |
| `notify.py` | 通过 osascript 发送 macOS 系统通知 |

## 流程图

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Claude Code Stop 事件触发                        │
│                 (通过 stdin 传入 JSON 数据)                          │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   hook.sh    │  主入口脚本
                    └──────┬───────┘
                           │
              ┌────────────┼────────────────┐
              │            │                │
              ▼            ▼                ▼
     ┌─────────────┐ ┌──────────┐  ┌───────────────┐
     │ 读取 stdin  │ │初始化变量│  │ 记录日志      │
     │ JSON 数据   │ │时间戳/路径│  │ ~/.claude-code│
     └──────┬──────┘ └──────────┘  └───────────────┘
            │
            ▼
  ┌─────────────────────────────────────────┐
  │        获取会话信息（三级回退）            │
  │                                         │
  │  1. parse_hook.py 解析 stdin JSON       │
  │     ├─ 提取 session_id                  │
  │     └─ 读取 transcript 提取最后用户消息  │
  │                                         │
  │  2. 环境变量回退                         │
  │     ├─ CLAUDE_LAST_QUESTION             │
  │     └─ CLAUDE_SESSION_ID                │
  │                                         │
  │  3. 命令行参数回退                       │
  │     ├─ $1 → LAST_USER_QUESTION          │
  │     └─ $2 → SESSION_ID                  │
  │                                         │
  │  4. 默认值                              │
  │     ├─ "Task completed"                 │
  │     └─ uuidgen / "unknown"              │
  └─────────────────┬───────────────────────┘
                    │
                    ▼
           ┌─────────────────┐
           │   检测操作系统   │  macOS / Linux / Windows
           └────────┬────────┘
                    │
                    ▼
        ┌───────────────────────────┐
        │      终端输出完成信息       │
        │  ╔══════════════════════╗  │
        │  ║  Task Completed!     ║  │
        │  ╚══════════════════════╝  │
        └─────────────┬─────────────┘
                      │
         ┌────────────┼────────────────────┐
         │            │                    │
         ▼            ▼                    ▼
  ┌────────────┐ ┌──────────┐    ┌──────────────────┐
  │  系统通知   │ │ 提示音   │    │  远程通知（可选）  │
  │            │ │          │    │                  │
  │ macOS:     │ │ macOS:   │    │ Slack:           │
  │ notify.py  │ │ (通知自带)│    │ SLACK_WEBHOOK_URL│
  │ ↓osascript │ │          │    │                  │
  │            │ │ Linux:   │    │ Email:           │
  │ Linux:     │ │ paplay   │    │ NOTIFICATION_    │
  │ notify-send│ │          │    │   EMAIL          │
  └────────────┘ └──────────┘    └──────────────────┘
                      │
                      ▼
            ┌──────────────────┐
            │ 自定义后置命令    │
            │ POST_TASK_COMMAND│
            └──────────────────┘
                      │
                      ▼
                   exit 0
```

## 脚本执行逻辑详解

### hook.sh — 主入口

1. **初始化**：获取脚本目录、时间戳、当前工作目录、日志文件路径
2. **读取 stdin**：Claude Code 通过 stdin 传入 JSON（含 `session_id`、`transcript_path`）
3. **解析会话信息**：调用 `parse_hook.py`，三级回退策略确保总能拿到值
4. **检测操作系统**：根据 `$OSTYPE` 判断 macOS/Linux/Windows
5. **终端输出**：显示带颜色的完成信息框
6. **发送通知**：按操作系统选择通知方式
7. **可选远程通知**：Slack webhook / 邮件（需配置环境变量）
8. **可选后置命令**：执行 `POST_TASK_COMMAND`

### parse_hook.py — stdin 解析

```
stdin JSON ──→ json.loads()
                 ├─ data["session_id"]      → 第 1 行输出
                 └─ data["transcript_path"]
                      └─ 逐行读取 JSONL
                           └─ type=="user" 的最后一条 content
                                → 第 2 行输出（截断 200 字符）
```

- 输入：通过环境变量 `_HOOK_STDIN` 传入 stdin 原始数据
- 输出：两行文本 — 第 1 行 `session_id`，第 2 行用户最后消息

### notify.py — macOS 通知

通过环境变量接收通知内容，拼接 AppleScript 调用 `osascript`：

```
_NOTIFY_TITLE   → with title "✅任务完成"
_NOTIFY_SUBTITLE→ subtitle "~/projects"
_NOTIFY_MESSAGE → display notification "修复登录 bug"
_NOTIFY_SOUND   → sound name "Ping"
```

## 环境变量配置

| 变量 | 必填 | 说明 |
|------|------|------|
| `NOTIFICATION_SOUND` | 否 | macOS 提示音名称，默认 `Ping` |
| `SLACK_WEBHOOK_URL` | 否 | 设置后启用 Slack 通知 |
| `NOTIFICATION_EMAIL` | 否 | 设置后启用邮件通知（需系统 `mail` 命令） |
| `POST_TASK_COMMAND` | 否 | 任务完成后执行的自定义 shell 命令 |

## 依赖

- `python3` — 解析 JSON、发送通知
- `osascript` — macOS 系统通知（系统自带）
- `notify-send` — Linux 系统通知（可选，`apt install libnotify-bin`）
