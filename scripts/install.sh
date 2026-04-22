#!/bin/bash

# claude-code-extend 一键安装脚本
# 用法: bash scripts/install.sh (在仓库根目录执行)
# 或: curl -fsSL <url>/scripts/install.sh | bash -s -- --repo <path>

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 解析参数
REPO_DIR=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --repo) REPO_DIR="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# 确定仓库根目录
if [ -z "$REPO_DIR" ]; then
  REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
fi

if [ ! -d "$REPO_DIR/packages" ]; then
  echo -e "${RED}错误: 未找到 packages 目录，请在仓库根目录运行此脚本${NC}"
  exit 1
fi

CLAUDE_DIR="$HOME/.claude"
EXTEND_DIR="$HOME/.claude-extend"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"

echo -e "${BLUE}=== claude-code-extend 一键安装 ===${NC}"
echo ""

# 1. 备份 settings.json
echo -e "${YELLOW}[1/4] 备份 settings.json...${NC}"
if [ -f "$SETTINGS_FILE" ]; then
  BACKUP_DIR="$CLAUDE_DIR/backups"
  mkdir -p "$BACKUP_DIR"
  TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
  cp "$SETTINGS_FILE" "$BACKUP_DIR/settings.json.$TIMESTAMP"
  echo -e "${GREEN}  已备份到 $BACKUP_DIR/settings.json.$TIMESTAMP${NC}"
else
  echo -e "${YELLOW}  settings.json 不存在，将创建新文件${NC}"
fi

# 2. 扫描并安装所有脚本（符号链接方式）
echo ""
echo -e "${YELLOW}[2/4] 安装脚本到 $EXTEND_DIR (符号链接)...${NC}"

INSTALLED_COUNT=0
FAILED_COUNT=0

for TYPE_DIR in hooks agents tools; do
  TYPE_PATH="$REPO_DIR/packages/$TYPE_DIR"
  [ ! -d "$TYPE_PATH" ] && continue

  for SCRIPT_DIR in "$TYPE_PATH"/*/; do
    [ ! -d "$SCRIPT_DIR" ] && continue

    SCRIPT_NAME=$(basename "$SCRIPT_DIR")

    # 查找入口脚本
    ENTRY_FILE=""
    for CANDIDATE in hook.sh hook.bash hook.py hook.ts agent.sh agent.py agent.ts tool.sh tool.py tool.ts tool.js; do
      if [ -f "$SCRIPT_DIR/$CANDIDATE" ]; then
        ENTRY_FILE="$CANDIDATE"
        break
      fi
    done

    if [ -z "$ENTRY_FILE" ]; then
      echo -e "${RED}  跳过 $SCRIPT_NAME: 未找到入口脚本${NC}"
      FAILED_COUNT=$((FAILED_COUNT + 1))
      continue
    fi

    # 检查 @claude-extend 标记
    if ! head -20 "$SCRIPT_DIR/$ENTRY_FILE" | grep -q '@claude-extend'; then
      echo -e "${YELLOW}  跳过 $SCRIPT_NAME: 无 @claude-extend 标记${NC}"
      continue
    fi

    # 创建符号链接
    DEST_DIR="$EXTEND_DIR/$TYPE_DIR/$SCRIPT_NAME"
    mkdir -p "$(dirname "$DEST_DIR")"

    if [ -L "$DEST_DIR" ] || [ -d "$DEST_DIR" ]; then
      rm -rf "$DEST_DIR"
    fi

    ln -s "$SCRIPT_DIR" "$DEST_DIR"
    echo -e "${GREEN}  ✓ $TYPE_DIR/$SCRIPT_NAME -> $SCRIPT_DIR${NC}"
    INSTALLED_COUNT=$((INSTALLED_COUNT + 1))
  done
done

# 3. 更新 settings.json
echo ""
echo -e "${YELLOW}[3/4] 更新 settings.json...${NC}"

# 用 python3 安全合并 hooks 配置
python3 -c "
import json, os, glob, re

settings_file = os.path.expanduser('$SETTINGS_FILE')
extend_dir = os.path.expanduser('$EXTEND_DIR')

# 读取现有配置
if os.path.isfile(settings_file):
    with open(settings_file) as f:
        settings = json.load(f)
else:
    settings = {}

if 'hooks' not in settings:
    settings['hooks'] = {}

# 扫描已安装的 hook 脚本
hooks_dir = os.path.join(extend_dir, 'hooks')
if os.path.isdir(hooks_dir):
    for name in os.listdir(hooks_dir):
        script_dir = os.path.join(hooks_dir, name)
        if not os.path.isdir(script_dir):
            continue

        # 查找入口脚本
        entry_file = None
        for candidate in ['hook.sh', 'hook.bash', 'hook.py', 'hook.ts']:
            if os.path.isfile(os.path.join(script_dir, candidate)):
                entry_file = candidate
                break

        if not entry_file:
            continue

        # 解析头部注释
        script_path = os.path.join(script_dir, entry_file)
        real_path = os.path.realpath(script_path)

        metadata = {}
        with open(real_path) as f:
            for line in f:
                stripped = line.strip()
                if stripped.startswith('#') or stripped.startswith('//'):
                    m = re.match(r'(?:#\s*|//\s*)@([\w-]+)(?:\s+(.+))?', stripped)
                    if m:
                        metadata[m.group(1)] = (m.group(2) or '').strip()
                elif stripped and not stripped.startswith('!'):
                    break

        if 'claude-extend' not in metadata or 'event' not in metadata:
            continue

        events = [e.strip() for e in metadata['event'].split(',') if e.strip()]
        matcher = metadata.get('matcher', '')
        command = f'bash {script_dir}/{entry_file}'

        for idx, event in enumerate(events):
            # matcher 仅应用于第一个事件，其余事件 matcher 为空
            event_matcher = matcher if idx == 0 else ''

            # 移除已有的同名托管条目
            if event in settings['hooks']:
                settings['hooks'][event] = [
                    entry for entry in settings['hooks'][event]
                    if not any(
                        '.claude-extend/' in h.get('command', '') and f'/{name}/' in h.get('command', '')
                        for h in entry.get('hooks', [])
                    )
                ]
            else:
                settings['hooks'][event] = []

            # 添加新条目
            settings['hooks'][event].append({
                'matcher': event_matcher,
                'hooks': [{'type': 'command', 'command': command}]
            })

            print(f'  {event}: {name}{" [matcher=" + event_matcher + "]" if event_matcher else ""}')

# 写回
with open(settings_file, 'w') as f:
    json.dump(settings, f, ensure_ascii=False, indent=2)
print('OK')
"

if [ $? -eq 0 ]; then
  echo -e "${GREEN}  settings.json 已更新${NC}"
else
  echo -e "${RED}  settings.json 更新失败${NC}"
fi

# 4. 验证
echo ""
echo -e "${YELLOW}[4/4] 验证安装${NC}"

if [ -d "$EXTEND_DIR/hooks" ]; then
  for d in "$EXTEND_DIR/hooks"/*/; do
    [ -d "$d" ] && echo -e "${GREEN}  ✓ $(basename "$d")${NC}"
  done
fi

echo ""
echo -e "${GREEN}安装完成！已安装 $INSTALLED_COUNT 个脚本${NC}"
[ $FAILED_COUNT -gt 0 ] && echo -e "${RED}  $FAILED_COUNT 个脚本安装失败${NC}"
echo ""
echo -e "管理命令: npx claude-extend list | install | uninstall | info"
