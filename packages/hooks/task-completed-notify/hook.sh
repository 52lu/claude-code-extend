#!/bin/bash

# @claude-extend
# @name task-completed-notify
# @type hook
# @event Stop
# @description 任务完成时发送通知（macOS/Linux 系统通知 + Slack/邮件可选）
# @dependencies python3, osascript
# @version 1.0.0

# Claude Code Task Completion Hook
# 当 Claude Code 任务完成时触发的通知脚本

# 脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 获取当前时间
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# 日志文件路径
LOG_FILE="$HOME/.claude-code/task-completion.log"
mkdir -p "$(dirname "$LOG_FILE")"

# 获取当前工作目录（用 ~ 替代用户根目录，缩短显示）
CURRENT_PATH=$(pwd | sed "s|^$HOME|~|")

# 获取用户问题和会话ID
LAST_USER_QUESTION=""
SESSION_ID=""
STDIN_DATA=""

# 1. 从 stdin 读取 JSON（Claude Code hooks 通过 stdin 传递数据）
if [ ! -t 0 ]; then
    STDIN_DATA=$(cat)
    echo "[$TIMESTAMP] Hook stdin: $STDIN_DATA" >> "$LOG_FILE"

    # 使用 python3 解析 stdin JSON 和 transcript 文件
    if command -v python3 &> /dev/null; then
        PARSE_RESULT=$(_HOOK_STDIN="$STDIN_DATA" python3 "$SCRIPT_DIR/parse_hook.py" 2>/dev/null)
        SESSION_ID=$(echo "$PARSE_RESULT" | head -1)
        LAST_USER_QUESTION=$(echo "$PARSE_RESULT" | tail -1)
    fi
fi

# 2. 环境变量回退
if [ -z "$LAST_USER_QUESTION" ]; then
    LAST_USER_QUESTION="${CLAUDE_LAST_QUESTION:-}"
fi
if [ -z "$SESSION_ID" ]; then
    SESSION_ID="${CLAUDE_SESSION_ID:-}"
fi

# 3. 命令行参数回退
if [ -z "$LAST_USER_QUESTION" ] && [ -n "$1" ]; then
    LAST_USER_QUESTION="$1"
fi
if [ -z "$SESSION_ID" ] && [ -n "$2" ]; then
    SESSION_ID="$2"
fi

# 4. 默认值
if [ -z "$LAST_USER_QUESTION" ]; then
    LAST_USER_QUESTION="Task completed"
fi
if [ -z "$SESSION_ID" ]; then
    SESSION_ID=$(uuidgen 2>/dev/null || echo "unknown")
fi

# 保存会话信息到当前目录下的 current-session.json
save_session_info() {
    _HOOK_TIMESTAMP="$TIMESTAMP" \
    _HOOK_PATH="$CURRENT_PATH" \
    _HOOK_SESSION="$SESSION_ID" \
    _HOOK_QUESTION="$LAST_USER_QUESTION" \
    _HOOK_STDIN="${STDIN_DATA:-}" \
    python3 "$SCRIPT_DIR/save_session.py" 2>/dev/null
}

# 记录日志
echo "[$TIMESTAMP] Task completed - Path: $CURRENT_PATH, Session: $SESSION_ID, Title: $LAST_USER_QUESTION" >> "$LOG_FILE"

# 保存会话信息
save_session_info

# 检测操作系统
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

OS=$(detect_os)

# 通知提示音（可选值：Basso, Blow, Bottle, Frog, Funk, Glass, Hero, Morse, Ping, Pop, Purr, Sosumi, Submarine, Tink）
NOTIFICATION_SOUND="${NOTIFICATION_SOUND:-Ping}"

# 截断过长标题
short_title="${LAST_USER_QUESTION:0:50}"
[ ${#LAST_USER_QUESTION} -gt 50 ] && short_title="${short_title}..."

# 发送系统通知
send_notification() {
    case $OS in
        macos)
            # 使用 python3 调用 osascript，确保 UTF-8 编码正确
            _NOTIFY_TITLE="✅任务完成" \
            _NOTIFY_SUBTITLE="$CURRENT_PATH" \
            _NOTIFY_MESSAGE="$short_title" \
            _NOTIFY_SOUND="$NOTIFICATION_SOUND" \
            python3 "$SCRIPT_DIR/notify.py" 2>/dev/null
            ;;
        linux)
            if command -v notify-send &> /dev/null; then
                notify-send "Claude Code Complete" "$short_title
$CURRENT_PATH" -i dialog-information
            else
                echo "notify-send not found. Install with: sudo apt-get install libnotify-bin"
            fi
            ;;
        *)
            echo "Unsupported OS: $OS"
            ;;
    esac
}

# 播放提示音（可选，仅当通知未自带声音时启用）
play_sound() {
    case $OS in
        macos)
            # display notification 已带 sound name，无需额外播放
            ;;
        linux)
            if command -v paplay &> /dev/null; then
                paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null
            fi
            ;;
    esac
}

# 发送 Slack 通知（如果配置了 webhook）
send_slack_notification() {
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H "Content-type: application/json" \
            --data "{\"text\":\"Claude Code task completed at $TIMESTAMP\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null
    fi
}

# 发送邮件通知（如果配置了）
send_email_notification() {
    if [ -n "$NOTIFICATION_EMAIL" ]; then
        if command -v mail &> /dev/null; then
            echo "Claude Code task completed at $TIMESTAMP" | \
                mail -s "Claude Code Task Complete" "$NOTIFICATION_EMAIL"
        fi
    fi
}

# 在终端显示完成信息
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Claude Code Task Completed!           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo -e "${BLUE}Time:       ${YELLOW}$TIMESTAMP${NC}"
echo -e "${BLUE}Path:       ${YELLOW}$CURRENT_PATH${NC}"
echo -e "${BLUE}Title:      ${YELLOW}$LAST_USER_QUESTION${NC}"
echo -e "${BLUE}Session ID: ${YELLOW}$SESSION_ID${NC}"
echo ""

# 执行通知
send_notification
play_sound

# 可选：发送远程通知
send_slack_notification
send_email_notification

# 可选：执行自定义命令
if [ -n "$POST_TASK_COMMAND" ]; then
    echo -e "${BLUE}Executing post-task command...${NC}"
    eval "$POST_TASK_COMMAND"
fi

exit 0
