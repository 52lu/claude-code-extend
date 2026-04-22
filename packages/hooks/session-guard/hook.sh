#!/bin/bash

# @claude-extend
# @name session-guard
# @type hook
# @event Notification,Stop
# @matcher idle_prompt
# @description 会话守护：空闲时交互式询问是否复用上次会话，结束时更新会话记录
# @dependencies python3
# @version 1.1.0

# Claude Code Session Guard Hook
# Notification 事件: 检查 current-session.json，交互式询问是否复用
# Stop 事件: 更新 current-session.json

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Claude Code 通过 stdin 传入 JSON，转发给 python 脚本
# python 脚本负责：检测会话文件 + 交互式询问 + 返回 additionalContext
python3 "$SCRIPT_DIR/session_guard.py"

exit 0
