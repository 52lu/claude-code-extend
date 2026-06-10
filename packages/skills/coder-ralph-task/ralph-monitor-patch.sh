#!/bin/bash
# ralph-monitor-patch.sh — 检查并补丁 ~/.ralph/ralph_monitor.sh，增加运行目录显示
# 用法: bash packages/skills/coder-ralph-task/ralph-monitor-patch.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
python3 "$SCRIPT_DIR/ralph-monitor-patch.py"
