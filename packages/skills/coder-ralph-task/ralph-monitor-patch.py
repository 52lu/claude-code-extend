#!/usr/bin/env python3
"""
ralph-monitor-patch.py — 为 ~/.ralph/ralph_monitor.sh 增加 Working Dir 绿色显示

变更说明：
  1. 在 status 变量解析后，插入 working_dir / short_dir 变量
  2. 在 Current Status 区的 Loop Count 行前，插入 Working Dir 行（绿色）

幂等：已打过补丁的文件不会重复修改。
"""

import shutil
import sys
from datetime import datetime
from pathlib import Path

RALPH_MONITOR = Path.home() / ".ralph" / "ralph_monitor.sh"
PATCH_MARKER = "# @patch:working-dir-display"


def main():
    print("=== Ralph Monitor 补丁检查 ===\n")

    # 检查目标文件
    if not RALPH_MONITOR.exists():
        print(f"❌ 错误: {RALPH_MONITOR} 不存在，请先安装 ralph")
        sys.exit(1)

    content = RALPH_MONITOR.read_text()
    lines = content.splitlines(keepends=True)

    # 幂等检查
    if PATCH_MARKER in content:
        print("✅ 补丁已存在，无需重复打补丁")
        return

    # 查找 status 变量赋值行（包含 .status // "unknown"）
    status_idx = None
    for i, line in enumerate(lines):
        if '.status // "unknown"' in line:
            status_idx = i
            break

    if status_idx is None:
        print("❌ 错误: 未找到 status 变量赋值行，文件格式可能已变更")
        print(f"   请手动检查 {RALPH_MONITOR}")
        sys.exit(1)

    # ---- 补丁 1：在 status 行后插入变量定义 ----
    patch_vars = [
        "\n",
        f"        {PATCH_MARKER}\n",
        "        # 当前运行目录\n",
        '        local working_dir=$(pwd)\n',
        '        local short_dir="${working_dir/$HOME/\\~}"\n',
    ]
    for j, pl in enumerate(patch_vars):
        lines.insert(status_idx + 1 + j, pl)

    # ---- 补丁 2：在 Loop Count 行前插入 Working Dir 显示行 ----
    new_lines = []
    for line in lines:
        if "Loop Count:" in line and PATCH_MARKER not in line:
            # 注意：这里用 | 而非 │，因为 sed/终端兼容性更好
            # 但原文件用的是 Unicode box-drawing 字符 │，需要匹配
            new_lines.append(
                '        echo -e "${CYAN}│${NC} Working Dir:    ${GREEN}$short_dir${NC}"\n'
            )
        new_lines.append(line)

    # 备份
    backup = RALPH_MONITOR.parent / f"ralph_monitor.sh.bak.{datetime.now().strftime('%Y%m%d%H%M%S')}"
    shutil.copy2(RALPH_MONITOR, backup)
    print(f"已备份至 {backup}")

    # 写入
    RALPH_MONITOR.write_text("".join(new_lines))

    # 验证
    if PATCH_MARKER in RALPH_MONITOR.read_text():
        print("✅ 补丁成功应用！\n")
        print("  变更内容：")
        print("  - 在 Current Status 区域新增 Working Dir 行（绿色显示当前运行目录）")
        print("  - 自动将 HOME 目录缩写为 ~")
        print(f"\n  备份文件: {backup}")
    else:
        # 还原
        shutil.copy2(backup, RALPH_MONITOR)
        print("❌ 补丁应用失败，已还原，请手动修改")
        sys.exit(1)


if __name__ == "__main__":
    main()
