#!/usr/bin/env python3
"""保存会话信息到 current-session.json"""

import json
import os

data = {
    "timestamp": os.environ.get("_HOOK_TIMESTAMP", ""),
    "working_directory": os.environ.get("_HOOK_PATH", "").replace(
        os.environ.get("HOME", ""), "~", 1
    ),
    "session_id": os.environ.get("_HOOK_SESSION", ""),
    "last_user_message": os.environ.get("_HOOK_QUESTION", ""),
}
stdin_raw = os.environ.get("_HOOK_STDIN", "")
if stdin_raw:
    try:
        data["raw_input"] = json.loads(stdin_raw)
    except Exception:
        data["raw_input"] = stdin_raw

session_file = os.path.join(
    os.environ.get("_HOOK_PATH", "."), "current-session.json"
)
with open(session_file, "w") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
