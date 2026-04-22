#!/usr/bin/env python3
"""session-guard: Claude Code 会话守护 hook

事件:
  - Notification (matcher: idle_prompt): 检查 current-session.json，通过 additionalContext 让 Claude 询问用户
  - Stop: 更新 current-session.json

注意: Hook 的 stdin 被 Claude Code 的 JSON 数据占用，无法用 input() 读取终端输入。
因此交互式问答通过 additionalContext 注入到 Claude 的对话上下文中，由 Claude 主动询问用户。

stdin JSON 字段:
  session_id, transcript_path, cwd, hook_event_name, message,
  notification_type (Notification), stop_hook_active, last_assistant_message (Stop)
"""

import json
import sys
import os
from datetime import datetime


# 颜色定义
GREEN = "\033[0;32m"
BLUE = "\033[0;34m"
YELLOW = "\033[1;33m"
CYAN = "\033[0;36m"
NC = "\033[0m"
BOLD = "\033[1m"

# 日志文件
LOG_DIR = os.path.join(os.path.expanduser("~"), ".claude-code")
LOG_FILE = os.path.join(LOG_DIR, "session-guard.log")


def log(msg):
    """写入日志文件"""
    try:
        os.makedirs(LOG_DIR, exist_ok=True)
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(LOG_FILE, "a") as f:
            f.write(f"[{timestamp}] {msg}\n")
    except Exception:
        pass


def read_stdin():
    """从 stdin 读取 Claude Code 传入的 JSON 数据"""
    try:
        raw = sys.stdin.read()
        return json.loads(raw) if raw.strip() else {}
    except Exception as e:
        log(f"stdin parse error: {e}")
        return {}


def get_session_file(cwd):
    """获取当前目录下的 current-session.json 路径"""
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
        log(f"transcript not found: {transcript_path}")
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
    except Exception as e:
        log(f"transcript read error: {e}")
    return last_msg[:200]


def handle_notification(data):
    """处理 Notification 事件

    - 如果 notification_type 不是 idle_prompt，忽略
    - 如果 current-session.json 存在，通过 additionalContext 让 Claude 询问用户是否复用
    - 如果不存在，创建初始会话文件
    """
    notification_type = data.get("notification_type", "")
    if notification_type != "idle_prompt":
        log(f"skip notification_type={notification_type}, waiting for idle_prompt")
        return None

    cwd = data.get("cwd", os.getcwd())
    session_id = data.get("session_id", "unknown")
    transcript_path = data.get("transcript_path", "")

    log(f"Notification(idle_prompt) triggered, cwd={cwd}, session={session_id}")

    session_file = get_session_file(cwd)
    existing = read_session(session_file)

    if existing:
        prev_msg = existing.get("last_user_message", "")
        prev_time = existing.get("timestamp", "")
        prev_status = existing.get("status", "")
        resume_count = existing.get("resume_count", 0)
        prev_assistant = existing.get("last_assistant_message", "")
        work_dir = existing.get("working_directory", "")

        log(f"found existing session: status={prev_status}, resume_count={resume_count}, msg={prev_msg[:40]}")

        # 更新 resume 计数
        new_count = resume_count + 1
        existing["resume_count"] = new_count
        existing["last_resumed_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        write_session(session_file, existing)

        # 通过 additionalContext 注入上下文，让 Claude 在对话中主动询问用户
        # 注意：hook 的 stdin 被 Claude Code 占用，无法用 input() 读取终端输入
        status_desc = "已完成" if prev_status == "completed" else "未完成"
        context = (
            f"[session-guard] 检测到当前目录存在上次的会话记录（{status_desc}）。\n"
            f"- 上次提问: {prev_msg}\n"
            f"- 上次回复摘要: {prev_assistant[:200] if prev_assistant else '无'}\n"
            f"- 时间: {prev_time}\n"
            f"- 已恢复次数: {new_count}\n"
            f"- 工作目录: {work_dir}\n\n"
            f"请你用中文直接询问用户：「是否继续上次的对话？如果继续，我将基于之前的上下文继续工作；如果不需要，我们将开始全新的对话。」\n"
            f"等待用户回答后再继续。如果用户选择继续，请基于以上上下文恢复工作。"
        )

        log(f"returning additionalContext for resume (resume_count={new_count})")
        return {"additionalContext": context}
    else:
        # 首次进入，创建初始会话文件
        log(f"no existing session found, creating new one at {session_file}")
        last_user_msg = extract_last_user_message(transcript_path)

        session_data = {
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "working_directory": cwd.replace(os.environ.get("HOME", ""), "~", 1),
            "session_id": session_id,
            "last_user_message": last_user_msg,
            "resume_count": 0,
        }

        if data:
            session_data["raw_input"] = data

        write_session(session_file, session_data)
        log(f"session file created, user_msg={last_user_msg[:40]}")
        return None


def handle_stop(data):
    """处理 Stop 事件：更新 current-session.json"""
    cwd = data.get("cwd", os.getcwd())
    session_id = data.get("session_id", "unknown")
    transcript_path = data.get("transcript_path", "")
    stop_hook_active = data.get("stop_hook_active", False)

    log(f"Stop event triggered, cwd={cwd}, session={session_id}, stop_hook_active={stop_hook_active}")

    # 防止无限循环
    if stop_hook_active:
        log("skipping: stop_hook_active=True (prevent loop)")
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
    log(f"session updated: status=completed, user_msg={last_user_msg[:40]}, asst_msg={last_assistant_msg[:40]}")
    return None


def main():
    data = read_stdin()
    event = data.get("hook_event_name", "")

    log(f"hook invoked, event={event}")

    if event == "Notification":
        result = handle_notification(data)
    elif event == "Stop":
        result = handle_stop(data)
    else:
        log(f"unknown event: {event}")
        result = None

    # Claude Code hooks 通过 stdout 读取 JSON 输出
    if result:
        output = json.dumps(result, ensure_ascii=False)
        log(f"returning additionalContext ({len(output)} bytes)")
        print(output)
    else:
        log("no output (no additionalContext)")


if __name__ == "__main__":
    log("=== session-guard started ===")
    main()
    log("=== session-guard finished ===")
