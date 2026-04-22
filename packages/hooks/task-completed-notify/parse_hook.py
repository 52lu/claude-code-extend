#!/usr/bin/env python3
"""解析 Claude Code hook stdin JSON，提取 session_id 和用户最后一条消息"""

import json
import sys
import os

stdin_data = os.environ.get("_HOOK_STDIN", "")
result = ["", ""]

try:
    data = json.loads(stdin_data)
    result[0] = data.get("session_id", "")
    transcript_path = data.get("transcript_path", "")

    if transcript_path and os.path.isfile(transcript_path):
        last_msg = ""
        with open(transcript_path) as f:
            for line in f:
                try:
                    obj = json.loads(line)
                    if obj.get("type") == "user":
                        content = obj.get("message", {}).get("content")
                        if isinstance(content, str):
                            last_msg = content
                except Exception:
                    pass
        result[1] = last_msg[:200]
except Exception:
    pass

# 每行一个输出，避免 tab 分隔被截断
print(result[0])
print(result[1], end="")
