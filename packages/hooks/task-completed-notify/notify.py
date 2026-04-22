#!/usr/bin/env python3
"""发送 macOS 系统通知"""

import subprocess
import sys
import os

title = os.environ.get("_NOTIFY_TITLE", "Claude Code Complete")
subtitle = os.environ.get("_NOTIFY_SUBTITLE", "")
message = os.environ.get("_NOTIFY_MESSAGE", "Task completed")
sound = os.environ.get("_NOTIFY_SOUND", "Ping")

# 构建 AppleScript，用文本拼接确保 UTF-8 正确
parts = []
parts.append(f'display notification "{message}"')
if title:
    parts.append(f'with title "{title}"')
if subtitle:
    parts.append(f'subtitle "{subtitle}"')
if sound:
    parts.append(f'sound name "{sound}"')

applescript = " ".join(parts)

subprocess.run(["osascript", "-e", applescript], check=False)
