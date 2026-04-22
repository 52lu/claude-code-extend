#!/bin/bash

# @claude-extend
# @name session-guard
# @type hook
# @event SessionStart,Stop
# @description 会话守护：启动时检查是否复用上次会话，结束时更新会话记录
# @dependencies python3
# @version 1.2.0

# Claude Code Session Guard Hook
# SessionStart 事件: 检查 current-session.json，通过 additionalContext 让 Claude 询问用户
# Stop 事件: 更新 current-session.json

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Claude Code 通过 stdin 传入 JSON，转发给 python 脚本
python3 "$SCRIPT_DIR/session_guard.py"

exit 0
