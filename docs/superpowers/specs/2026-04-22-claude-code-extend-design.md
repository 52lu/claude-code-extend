# claude-code-extend Project Design

## Overview

A GitHub-hosted monorepo for managing Claude Code hooks, agents, and tool scripts. Each script is an independently installable unit with two installation paths: npm package (single script) and shell script (bulk install). Metadata is embedded as file-header comments, parsed by a CLI tool.

## Directory Structure

```
claude-code-extend/
├── package.json                  # Root monorepo config (npm workspaces)
├── tsconfig.json                 # TypeScript config for CLI
├── packages/
│   ├── cli/                      # CLI tool: npx claude-extend
│   │   ├── src/
│   │   │   ├── index.ts          # Entry point
│   │   │   ├── commands/
│   │   │   │   ├── install.ts    # claude-extend install <name>
│   │   │   │   ├── list.ts       # claude-extend list
│   │   │   │   └── uninstall.ts  # claude-extend uninstall <name>
│   │   │   ├── parser.ts         # Parse script header comments into metadata
│   │   │   └── installer.ts      # Write settings.json / create symlinks
│   │   └── package.json          # @claude-extend/cli
│   ├── hooks/
│   │   └── task-completed-notify/
│   │       ├── hook.sh
│   │       └── package.json      # @claude-extend/hook-task-notify
│   ├── agents/
│   │   └── (future agent packages)
│   └── tools/
│       └── (future tool packages)
├── scripts/
│   └── install.sh                # One-click bulk install
└── README.md
```

## Script Header Comment Format

All scripts (regardless of language) use this header format:

```bash
#!/bin/bash
# @claude-extend
# @name task-completed-notify
# @type hook
# @event Stop
# @description 任务完成时发送通知
# @dependencies notify-send, osascript
# @version 1.0.0
```

Fields:
- `@claude-extend` — marker indicating this is a claude-extend script (required)
- `@name` — unique identifier (required)
- `@type` — one of: hook, agent, tool (required)
- `@event` — for hooks: Stop, PreToolUse, PostToolUse, Notification, SubagentStop (required for hooks)
- `@description` — human-readable description (required)
- `@dependencies` — comma-separated list of required commands/binaries (optional)
- `@version` — semver version (required)

Language-specific header variants:

Python:
```python
#!/usr/bin/env python3
# @claude-extend
# @name my-agent
# @type agent
# ...
```

TypeScript:
```typescript
#!/usr/bin/env node
// @claude-extend
// @name my-tool
// @type tool
// ...
```

## Installation

### Method 1: npm (single script) — copies files

```bash
# Install a specific script via CLI
npx claude-extend install hook-task-notify

# Or install the script's npm package directly
npm install -g @claude-extend/hook-task-notify
```

Install steps:
1. Parse script header comments for metadata
2. Copy script to `~/.claude-extend/<type>/<name>/`
3. If type is hook: update `~/.claude/settings.json` hook config for the specified event
4. If type is agent: create reference in `~/.claude/agents/`
5. Check that declared `@dependencies` exist on the system
6. Output install result + dependency check status

### Method 2: install.sh (bulk) — uses symlinks

```bash
curl -fsSL https://raw.githubusercontent.com/<user>/claude-code-extend/main/scripts/install.sh | bash
```

Or manual:
```bash
git clone https://github.com/<user>/claude-code-extend.git
cd claude-code-extend
./scripts/install.sh
```

install.sh behavior:
1. Scan all packages under `packages/`
2. Parse header comments for metadata
3. Create symlinks from repo files to `~/.claude-extend/<type>/<name>/` (symlinks so `git pull` updates installed scripts)
4. Update `~/.claude/settings.json` for all hook-type scripts
5. Output install summary

## CLI Commands

```
claude-extend <command>

Commands:
  list [--type hook|agent|tool]    List available scripts
  install <name>                   Install a specific script
  uninstall <name>                 Uninstall a specific script
  installed                        List installed scripts
  info <name>                      Show script details
```

`list` output format:
```
Hooks:
  task-completed-notify  Stop        任务完成时发送通知      v1.0.0

Agents:
  code-reviewer          -           自动代码审查代理        v0.1.0

Tools:
  setup-mcp              -           MCP Server 配置工具     v0.1.0
```

## settings.json Operations

### Safety strategy
- Backup to `~/.claude/backups/settings.json.<timestamp>` before any modification
- Merge, never overwrite — only modify the `hooks` field
- Leave env, plugins, and other config untouched

### Hook entry management
- Identify managed entries by `~/.claude-extend/` path prefix in the command
- On install: remove existing entries with same name, then add new entry
- On uninstall: remove matching entries; if an event's hooks array becomes empty, remove the event key

### Example

Before install:
```json
{
  "hooks": {
    "Stop": [
      { "matcher": "", "hooks": [{ "type": "command", "command": "bash /Users/horizon/shell/task-completed-notify/hook.sh" }] }
    ]
  }
}
```

After install (migrates old path to new managed path):
```json
{
  "hooks": {
    "Stop": [
      { "matcher": "", "hooks": [{ "type": "command", "command": "bash ~/.claude-extend/hooks/task-completed-notify/hook.sh" }] }
    ]
  }
}
```

## Script Installation Directory

All scripts are installed to `~/.claude-extend/`:
```
~/.claude-extend/
├── hooks/
│   └── task-completed-notify/
│       └── hook.sh
├── agents/
│   └── code-reviewer/
│       └── agent.py
└── tools/
    └── setup-mcp/
        └── tool.ts
```

This keeps `~/.claude/` clean and makes it easy to identify managed vs. unmanaged scripts.

## Initial Content

Migrate the existing `task-completed-notify` hook from `/Users/horizon/shell/task-completed-notify/` as the first script in the repository.

## Multi-language Support

Scripts can be written in Bash, Python, Go (compiled binary), or TypeScript. The header comment format adapts per language (see format section above). The CLI parser handles all variants.

For Go binaries: the binary is committed to the package directory. Header metadata is placed in a separate `<name>.meta` file alongside the binary, using the same `@key value` format with `# @claude-extend` marker.

## npm Package Naming

The CLI package is `@claude-extend/cli`.

Each script package follows the `@claude-extend/<type>-<name>` convention:
- Hooks: `@claude-extend/hook-task-notify`
- Agents: `@claude-extend/agent-code-reviewer`
- Tools: `@claude-extend/tool-setup-mcp`
