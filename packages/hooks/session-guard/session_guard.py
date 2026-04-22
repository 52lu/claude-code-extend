#!/usr/bin/env python3
"""session-guard: Claude Code 会话守护 hook

事件:
  - Notification (matcher: idle_prompt): 检查/创建 current-session.json
  - Stop: 更新 current-session.json

stdin JSON 字段:
  session_id, transcript_path, cwd, hook_event_name, message,
  notification_type (Notification), stop_hook_active, last_assistant_message (Stop)
"""

import json
import sys
import os
import re
from datetime import datetime


def read_stdin():
    """从 stdin 读取 Claude Code 传入的 JSON 数据"""
    try:
        raw = sys.stdin.read()
        return json.loads(raw) if raw.strip() else {}
    except Exception:
        return {}


def get_session_file(cwd):
    """获取当前目录下的 current-session.json 路径"""
    # cwd 可能含 ~ 前缀，展开
    expanded = os.path.expanduser(cwd) if cwd else os.getcwd()
    return os.path.join(expanded, "current-session.json")


def read_session(path):
    """读取已有的会话文件"""
    try:
        with open(path) as f:
            return json.load(f)
    except Exception:
        return None


def write_session(path, data):
    """写入会话文件"""
    with open(path, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def extract_last_user_message(transcript_path):
    """从 transcript JSONL 文件提取用户最后一条消息"""
    if not transcript_path or not os.path.isfile(transcript_path):
        return ""

    last_msg = ""
    try:
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
    except Exception:
        pass
    return last_msg[:200]


def handle_notification(data):
    """处理 Notification 事件

    - 如果 notification_type 不是 idle_prompt，忽略
    - 如果 current-session.json 存在，返回 additionalContext 提示继续对话
    - 如果不存在，创建初始会话文件
    """
    notification_type = data.get("notification_type", "")
    # 只处理 idle_prompt（Claude 空闲等待输入时）
    if notification_type != "idle_prompt":
        return None

    cwd = data.get("cwd", os.getcwd())
    session_id = data.get("session_id", "unknown")
    transcript_path = data.get("transcript_path", "")

    session_file = get_session_file(cwd)
    existing = read_session(session_file)

    if existing:
        # 会话文件已存在，提示用户继续之前的对话
        prev_msg = existing.get("last_user_message", "")
        prev_time = existing.get("timestamp", "")
        resume_count = existing.get("resume_count", 0) + 1

        # 更新 resume 计数
        existing["resume_count"] = resume_count
        existing["last_resumed_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        write_session(session_file, existing)

        context = (
            f"[session-guard] 检测到当前目录存在未完成的会话 "
            f"(上次提问: {prev_msg[:60]}{'...' if len(prev_msg) > 60 else ''}, "
            f"时间: {prev_time}, 已恢复 {resume_count} 次)。"
            f"请询问用户是否继续之前的对话。"
        )
        return {"additionalContext": context}
    else:
        # 首次进入，创建初始会话文件
        last_user_msg = extract_last_user_message(transcript_path)

        session_data = {
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "working_directory": cwd.replace(os.environ.get("HOME", ""), "~", 1),
            "session_id": session_id,
            "last_user_message": last_user_msg,
            "resume_count": 0,
        }

        # 写入 stdin 原始数据（调试用）
        raw_input = {}
        try:
            raw_input = data
        except Exception:
            pass
        if raw_input:
            session_data["raw_input"] = raw_input

        write_session(session_file, session_data)
        return None


def handle_stop(data):
    """处理 Stop 事件：更新 current-session.json"""
    cwd = data.get("cwd", os.getcwd())
    session_id = data.get("session_id", "unknown")
    transcript_path = data.get("transcript_path", "")
    stop_hook_active = data.get("stop_hook_active", False)

    # 防止无限循环
    if stop_hook_active:
        return None

    session_file = get_session_file(cwd)

    # 提取用户最后消息和 assistant 最后消息
    last_user_msg = extract_last_user_message(transcript_path)
    last_assistant_msg = data.get("last_assistant_message", "")

    session_data = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "working_directory": cwd.replace(os.environ.get("HOME", ""), "~", 1),
        "session_id": session_id,
        "last_user_message": last_user_msg,
        "last_assistant_message": last_assistant_msg[:500] if last_assistant_msg else "",
        "status": "completed",
    }

    # 保留 resume_count（如果之前有）
    existing = read_session(session_file)
    if existing:
        session_data["resume_count"] = existing.get("resume_count", 0)

    write_session(session_file, session_data)
    return None


def main():
    data = read_stdin()
    event = data.get("hook_event_name", "")

    if event == "Notification":
        result = handle_notification(data)
    elif event == "Stop":
        result = handle_stop(data)
    else:
        result = None

    # Claude Code hooks 通过 stdout 读取 JSON 输出
    if result:
        print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
