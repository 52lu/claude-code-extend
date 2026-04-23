#!/usr/bin/env python3
"""session-guard: Claude Code 会话守护 hook

事件:
  - SessionStart: 检查 session_id，不同则归档旧会话，创建新会话文件
  - Stop: 追加用户问题到 question_list，更新会话文件

存储路径: <cwd>/.claude/.user-session/current-session.json
"""

import json
import sys
import os
from datetime import datetime


LOG_DIR = os.path.join(os.path.expanduser("~"), ".claude-code")
LOG_FILE = os.path.join(LOG_DIR, "session-guard.log")


def log(msg):
    try:
        os.makedirs(LOG_DIR, exist_ok=True)
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(LOG_FILE, "a") as f:
            f.write(f"[{timestamp}] {msg}\n")
    except Exception:
        pass


def read_stdin():
    try:
        raw = sys.stdin.read()
        return json.loads(raw) if raw.strip() else {}
    except Exception as e:
        log(f"stdin parse error: {e}")
        return {}


def get_session_dir(cwd):
    expanded = os.path.expanduser(cwd) if cwd else os.getcwd()
    return os.path.join(expanded, ".claude", ".user-session")


def get_current_session_path(cwd):
    return os.path.join(get_session_dir(cwd), "current-session.json")


def get_last_session_path(cwd):
    return os.path.join(get_session_dir(cwd), "last-session.json")


def read_json(path):
    try:
        with open(path) as f:
            return json.load(f)
    except Exception:
        return None


def write_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def is_claude_command(msg):
    """判断是否为 Claude Code 斜杠命令（如 /compact, /clear 等）"""
    s = msg.strip()
    return s.startswith("/") and " " not in s and len(s) < 20


def extract_user_messages(transcript_path):
    """从 transcript JSONL 提取用户消息，排除斜杠命令"""
    if not transcript_path or not os.path.isfile(transcript_path):
        return []

    messages = []
    try:
        with open(transcript_path) as f:
            for line in f:
                try:
                    obj = json.loads(line)
                    if obj.get("type") == "user":
                        content = obj.get("message", {}).get("content")
                        if isinstance(content, str) and content.strip():
                            msg = content.strip()
                            if not is_claude_command(msg):
                                messages.append(msg)
                except Exception:
                    pass
    except Exception as e:
        log(f"transcript read error: {e}")
    return messages


def handle_session_start(data):
    cwd = data.get("cwd", os.getcwd())
    session_id = data.get("session_id", "unknown")
    source = data.get("source", "unknown")

    log(f"SessionStart: cwd={cwd}, session={session_id}, source={source}")

    session_dir = get_session_dir(cwd)
    current_path = get_current_session_path(cwd)
    last_path = get_last_session_path(cwd)

    existing = read_json(current_path)

    if existing and existing.get("session_id") != session_id:
        # 新会话，归档旧会话
        log(f"new session detected, archiving old session (old={existing.get('session_id')})")
        os.makedirs(session_dir, exist_ok=True)
        if os.path.exists(last_path):
            os.remove(last_path)
        os.rename(current_path, last_path)
        existing = None

    if existing:
        # 同一会话恢复（如 /compact），静默更新时间
        existing["last_resumed_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        write_json(current_path, existing)
        log(f"same session resumed, updated timestamp")
    else:
        # 创建新会话文件
        os.makedirs(session_dir, exist_ok=True)
        session_data = {
            "session_id": session_id,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "working_directory": cwd.replace(os.environ.get("HOME", ""), "~", 1),
            "question_list": [],
        }
        write_json(current_path, session_data)
        log(f"new session file created")

    return None


def handle_stop(data):
    cwd = data.get("cwd", os.getcwd())
    session_id = data.get("session_id", "unknown")
    transcript_path = data.get("transcript_path", "")
    stop_hook_active = data.get("stop_hook_active", False)

    log(f"Stop: cwd={cwd}, session={session_id}")

    if stop_hook_active:
        log("skipping: stop_hook_active=True")
        return None

    current_path = get_current_session_path(cwd)
    existing = read_json(current_path)

    # 从 transcript 提取用户消息，追加到 question_list
    user_messages = extract_user_messages(transcript_path)
    existing_questions = existing.get("question_list", []) if existing else []

    # 只追加新问题（基于内容去重）
    existing_set = set(existing_questions)
    new_questions = [m for m in user_messages if m not in existing_set]

    MAX_QUESTIONS = 5

    if existing:
        # 合并新问题，只保留最后 MAX_QUESTIONS 条
        all_questions = existing_questions + new_questions
        existing["question_list"] = all_questions[-MAX_QUESTIONS:]
        existing["last_updated"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        write_json(current_path, existing)
        log(f"session updated: +{len(new_questions)} questions, total={len(existing['question_list'])}")
    else:
        # Stop 时文件不存在，创建
        os.makedirs(os.path.dirname(current_path), exist_ok=True)
        session_data = {
            "session_id": session_id,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "working_directory": cwd.replace(os.environ.get("HOME", ""), "~", 1),
            "question_list": new_questions[-MAX_QUESTIONS:],
            "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
        write_json(current_path, session_data)
        log(f"session file created on Stop: {len(new_questions)} questions")

    return None


def main():
    data = read_stdin()
    event = data.get("hook_event_name", "")

    log(f"hook invoked, event={event}")

    if event == "SessionStart":
        result = handle_session_start(data)
    elif event == "Stop":
        result = handle_stop(data)
    else:
        log(f"unknown event: {event}")
        result = None

    if result:
        output = json.dumps(result, ensure_ascii=False)
        log(f"returning output ({len(output)} bytes)")
        print(output)
    else:
        log("no output")


if __name__ == "__main__":
    log("=== session-guard started ===")
    main()
    log("=== session-guard finished ===")
