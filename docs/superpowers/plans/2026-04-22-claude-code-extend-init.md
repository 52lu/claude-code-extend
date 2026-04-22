# claude-code-extend 项目初始化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 初始化 claude-code-extend monorepo 项目，包含 CLI 工具、第一个 hook 脚本（task-completed-notify）和一键安装脚本。

**Architecture:** npm workspaces monorepo，CLI 工具解析脚本头部注释元数据，管理 ~/.claude-extend/ 目录和 ~/.claude/settings.json 配置。每个脚本独立 npm 包 + 全局 install.sh 批量安装。

**Tech Stack:** TypeScript (CLI)、Bash/Python (hooks)、npm workspaces、commander.js

---

## 文件结构总览

| 文件 | 职责 |
|------|------|
| `package.json` | 根 monorepo 配置，声明 workspaces |
| `tsconfig.json` | TypeScript 编译配置 |
| `.gitignore` | 忽略 node_modules、dist 等 |
| `packages/cli/package.json` | CLI 包配置，bin 入口 |
| `packages/cli/tsconfig.json` | CLI 的 TypeScript 配置 |
| `packages/cli/src/index.ts` | CLI 入口，注册所有命令 |
| `packages/cli/src/parser.ts` | 解析脚本头部注释为元数据对象 |
| `packages/cli/src/installer.ts` | 安装/卸载逻辑：复制/链接脚本、修改 settings.json |
| `packages/cli/src/commands/list.ts` | `list` 命令实现 |
| `packages/cli/src/commands/install.ts` | `install` 命令实现 |
| `packages/cli/src/commands/uninstall.ts` | `uninstall` 命令实现 |
| `packages/cli/src/commands/installed.ts` | `installed` 命令实现 |
| `packages/cli/src/commands/info.ts` | `info` 命令实现 |
| `packages/cli/src/__tests__/parser.test.ts` | parser 单元测试 |
| `packages/cli/src/__tests__/installer.test.ts` | installer 单元测试 |
| `packages/hooks/task-completed-notify/hook.sh` | 迁移后的 hook 主脚本（带头部注释） |
| `packages/hooks/task-completed-notify/parse_hook.py` | 解析 stdin JSON |
| `packages/hooks/task-completed-notify/save_session.py` | 保存会话信息 |
| `packages/hooks/task-completed-notify/notify.py` | 发送 macOS 通知 |
| `packages/hooks/task-completed-notify/package.json` | hook 包配置 |
| `scripts/install.sh` | 一键批量安装脚本 |
| `README.md` | 项目说明文档 |

---

### Task 1: 初始化 monorepo 基础结构

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`

- [ ] **Step 1: 创建根 package.json**

```json
{
  "name": "claude-code-extend",
  "version": "0.1.0",
  "private": true,
  "description": "Claude Code hooks, agents, and tools manager",
  "workspaces": [
    "packages/*",
    "packages/hooks/*",
    "packages/agents/*",
    "packages/tools/*"
  ],
  "scripts": {
    "build": "npm run build -w @claude-extend/cli",
    "test": "npm run test -w @claude-extend/cli",
    "lint": "echo 'lint not configured yet'"
  }
}
```

- [ ] **Step 2: 创建根 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: 创建 .gitignore**

```
node_modules/
dist/
*.js.map
*.d.ts.map
.DS_Store
```

- [ ] **Step 4: 运行 npm install 初始化 workspaces**

```bash
npm install
```

Expected: 成功安装，生成 package-lock.json

- [ ] **Step 5: 提交**

```bash
git add package.json tsconfig.json .gitignore package-lock.json
git commit -m "chore: initialize monorepo with npm workspaces"
```

---

### Task 2: 初始化 CLI 包结构

**Files:**
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Create: `packages/cli/src/index.ts`

- [ ] **Step 1: 创建 CLI package.json**

```json
{
  "name": "@claude-extend/cli",
  "version": "0.1.0",
  "description": "CLI tool for managing Claude Code extensions",
  "bin": {
    "claude-extend": "./dist/index.js"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest --verbose"
  },
  "dependencies": {
    "commander": "^12.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: 创建 CLI tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "src/__tests__"]
}
```

- [ ] **Step 3: 创建 jest.config.js**

```javascript
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
};
```

- [ ] **Step 4: 创建 CLI 入口 src/index.ts**

```typescript
#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command();

program
  .name('claude-extend')
  .description('Manage Claude Code hooks, agents, and tools')
  .version('0.1.0');

// TODO: 注册子命令（后续 task 实现）
program
  .command('list')
  .description('List available scripts')
  .option('--type <type>', 'Filter by type: hook, agent, tool')
  .action(() => {
    console.log('list command - not yet implemented');
  });

program
  .command('install <name>')
  .description('Install a script')
  .action(() => {
    console.log('install command - not yet implemented');
  });

program
  .command('uninstall <name>')
  .description('Uninstall a script')
  .action(() => {
    console.log('uninstall command - not yet implemented');
  });

program
  .command('installed')
  .description('List installed scripts')
  .action(() => {
    console.log('installed command - not yet implemented');
  });

program
  .command('info <name>')
  .description('Show script details')
  .action(() => {
    console.log('info command - not yet implemented');
  });

program.parse();
```

- [ ] **Step 5: 安装依赖并构建**

```bash
npm install
npm run build -w @claude-extend/cli
```

Expected: 构建成功，无错误

- [ ] **Step 6: 验证 CLI 可运行**

```bash
node packages/cli/dist/index.js --help
```

Expected: 输出帮助信息，包含 list/install/uninstall/installed/info 命令

- [ ] **Step 7: 提交**

```bash
git add packages/cli/
git commit -m "feat: initialize CLI package with commander and stub commands"
```

---

### Task 3: 实现脚本头部注释解析器 (parser.ts)

**Files:**
- Create: `packages/cli/src/parser.ts`
- Create: `packages/cli/src/__tests__/parser.test.ts`

- [ ] **Step 1: 编写 parser 单元测试**

```typescript
// packages/cli/src/__tests__/parser.test.ts
import { parseScriptMetadata, ScriptMetadata } from '../parser';

describe('parseScriptMetadata', () => {
  it('should parse bash header comments', () => {
    const content = [
      '#!/bin/bash',
      '# @claude-extend',
      '# @name task-completed-notify',
      '# @type hook',
      '# @event Stop',
      '# @description 任务完成时发送通知',
      '# @dependencies notify-send, osascript',
      '# @version 1.0.0',
      '',
      'echo "hello"',
    ].join('\n');

    const result = parseScriptMetadata(content);
    expect(result).toEqual<ScriptMetadata>({
      name: 'task-completed-notify',
      type: 'hook',
      event: 'Stop',
      description: '任务完成时发送通知',
      dependencies: ['notify-send', 'osascript'],
      version: '1.0.0',
    });
  });

  it('should parse python header comments', () => {
    const content = [
      '#!/usr/bin/env python3',
      '# @claude-extend',
      '# @name my-agent',
      '# @type agent',
      '# @description 测试 agent',
      '# @version 0.1.0',
      '',
      'print("hello")',
    ].join('\n');

    const result = parseScriptMetadata(content);
    expect(result).toEqual<ScriptMetadata>({
      name: 'my-agent',
      type: 'agent',
      event: undefined,
      description: '测试 agent',
      dependencies: [],
      version: '0.1.0',
    });
  });

  it('should parse typescript header comments with // prefix', () => {
    const content = [
      '#!/usr/bin/env node',
      '// @claude-extend',
      '// @name my-tool',
      '// @type tool',
      '// @description 测试工具',
      '// @version 0.1.0',
      '',
      'console.log("hello")',
    ].join('\n');

    const result = parseScriptMetadata(content);
    expect(result).toEqual<ScriptMetadata>({
      name: 'my-tool',
      type: 'tool',
      event: undefined,
      description: '测试工具',
      dependencies: [],
      version: '0.1.0',
    });
  });

  it('should throw if @claude-extend marker is missing', () => {
    const content = '#!/bin/bash\necho "hello"';
    expect(() => parseScriptMetadata(content)).toThrow('Missing @claude-extend marker');
  });

  it('should throw if @name is missing', () => {
    const content = '#!/bin/bash\n# @claude-extend\n# @type hook\n# @version 1.0.0';
    expect(() => parseScriptMetadata(content)).toThrow('Missing required field: @name');
  });

  it('should throw if @type is missing', () => {
    const content = '#!/bin/bash\n# @claude-extend\n# @name foo\n# @version 1.0.0';
    expect(() => parseScriptMetadata(content)).toThrow('Missing required field: @type');
  });

  it('should throw if @version is missing', () => {
    const content = '#!/bin/bash\n# @claude-extend\n# @name foo\n# @type hook';
    expect(() => parseScriptMetadata(content)).toThrow('Missing required field: @version');
  });

  it('should throw if hook type is missing @event', () => {
    const content = '#!/bin/bash\n# @claude-extend\n# @name foo\n# @type hook\n# @version 1.0.0';
    expect(() => parseScriptMetadata(content)).toThrow('Hook scripts must specify @event');
  });

  it('should parse .meta file format for go binaries', () => {
    const content = [
      '# @claude-extend',
      '# @name my-go-tool',
      '# @type tool',
      '# @description Go 编译的工具',
      '# @version 1.2.0',
      '# @dependencies git',
    ].join('\n');

    const result = parseScriptMetadata(content);
    expect(result).toEqual<ScriptMetadata>({
      name: 'my-go-tool',
      type: 'tool',
      event: undefined,
      description: 'Go 编译的工具',
      dependencies: ['git'],
      version: '1.2.0',
    });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npm test -w @claude-extend/cli
```

Expected: FAIL — `Cannot find module '../parser'`

- [ ] **Step 3: 实现 parser.ts**

```typescript
// packages/cli/src/parser.ts
export interface ScriptMetadata {
  name: string;
  type: 'hook' | 'agent' | 'tool';
  event?: string;
  description: string;
  dependencies: string[];
  version: string;
}

export function parseScriptMetadata(content: string): ScriptMetadata {
  const lines = content.split('\n');
  const fields: Record<string, string> = {};
  let hasMarker = false;

  for (const line of lines) {
    const trimmed = line.trim();
    // 支持 # 和 // 两种注释前缀
    const match = trimmed.match(/^(?:#\s*|\/\/\s*)@(\w+)\s+(.+)$/);
    if (match) {
      const [, key, value] = match;
      if (key === 'claude-extend') {
        hasMarker = true;
      } else {
        fields[key] = value.trim();
      }
    }
    // 遇到非注释行停止解析头部
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('//') && !trimmed.startsWith('!')) {
      break;
    }
  }

  if (!hasMarker) {
    throw new Error('Missing @claude-extend marker');
  }

  const required = ['name', 'type', 'version'] as const;
  for (const field of required) {
    if (!fields[field]) {
      throw new Error(`Missing required field: @${field}`);
    }
  }

  const type = fields.type as ScriptMetadata['type'];
  if (type !== 'hook' && type !== 'agent' && type !== 'tool') {
    throw new Error(`Invalid @type: ${type}. Must be hook, agent, or tool`);
  }

  if (type === 'hook' && !fields.event) {
    throw new Error('Hook scripts must specify @event');
  }

  const dependencies = fields.dependencies
    ? fields.dependencies.split(',').map((d) => d.trim()).filter(Boolean)
    : [];

  return {
    name: fields.name,
    type,
    event: fields.event,
    description: fields.description || '',
    dependencies,
    version: fields.version,
  };
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npm test -w @claude-extend/cli
```

Expected: 7 tests PASS

- [ ] **Step 5: 提交**

```bash
git add packages/cli/src/parser.ts packages/cli/src/__tests__/parser.test.ts
git commit -m "feat: implement script header comment parser with tests"
```

---

### Task 4: 实现安装器 (installer.ts)

**Files:**
- Create: `packages/cli/src/installer.ts`
- Create: `packages/cli/src/__tests__/installer.test.ts`

- [ ] **Step 1: 编写 installer 单元测试**

```typescript
// packages/cli/src/__tests__/installer.test.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  getInstallDir,
  readSettings,
  writeSettings,
  addHookToSettings,
  removeHookFromSettings,
  installScript,
  uninstallScript,
} from '../installer';

// 测试用临时目录
let tmpDir: string;
let settingsPath: string;
let extendDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-extend-test-'));
  settingsPath = path.join(tmpDir, 'settings.json');
  extendDir = path.join(tmpDir, '.claude-extend');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('readSettings / writeSettings', () => {
  it('should read existing settings.json', () => {
    const settings = { hooks: { Stop: [] }, env: {} };
    fs.writeFileSync(settingsPath, JSON.stringify(settings));
    const result = readSettings(settingsPath);
    expect(result).toEqual(settings);
  });

  it('should return empty object if file does not exist', () => {
    const result = readSettings(settingsPath);
    expect(result).toEqual({});
  });

  it('should write settings and create backup', () => {
    const original = { hooks: { Stop: [] } };
    fs.writeFileSync(settingsPath, JSON.stringify(original));
    writeSettings(settingsPath, { hooks: { Stop: [{ matcher: '', hooks: [] }] } });
    // 备份应该存在
    const backupDir = path.join(tmpDir, 'backups');
    const backups = fs.readdirSync(backupDir);
    expect(backups.length).toBeGreaterThan(0);
  });
});

describe('addHookToSettings', () => {
  it('should add hook entry to specified event', () => {
    const settings: any = { hooks: {} };
    addHookToSettings(settings, 'Stop', 'bash ~/.claude-extend/hooks/test/hook.sh');
    expect(settings.hooks.Stop).toHaveLength(1);
    expect(settings.hooks.Stop[0].hooks[0].command).toContain('test/hook.sh');
  });

  it('should replace existing managed entry with same name', () => {
    const settings: any = {
      hooks: {
        Stop: [
          {
            matcher: '',
            hooks: [{ type: 'command', command: 'bash ~/.claude-extend/hooks/test/hook.sh' }],
          },
        ],
      },
    };
    addHookToSettings(settings, 'Stop', 'bash ~/.claude-extend/hooks/test/hook.sh');
    expect(settings.hooks.Stop).toHaveLength(1);
  });

  it('should not affect non-managed entries', () => {
    const settings: any = {
      hooks: {
        Stop: [
          {
            matcher: '',
            hooks: [{ type: 'command', command: 'bash /other/path/hook.sh' }],
          },
        ],
      },
    };
    addHookToSettings(settings, 'Stop', 'bash ~/.claude-extend/hooks/test/hook.sh');
    expect(settings.hooks.Stop).toHaveLength(2);
  });
});

describe('removeHookFromSettings', () => {
  it('should remove managed hook entries', () => {
    const settings: any = {
      hooks: {
        Stop: [
          {
            matcher: '',
            hooks: [{ type: 'command', command: 'bash ~/.claude-extend/hooks/test/hook.sh' }],
          },
        ],
      },
    };
    removeHookFromSettings(settings, 'test');
    expect(settings.hooks.Stop).toHaveLength(0);
  });

  it('should remove event key if hooks array becomes empty', () => {
    const settings: any = {
      hooks: {
        Stop: [
          {
            matcher: '',
            hooks: [{ type: 'command', command: 'bash ~/.claude-extend/hooks/test/hook.sh' }],
          },
        ],
      },
    };
    removeHookFromSettings(settings, 'test');
    expect(settings.hooks.Stop).toBeUndefined();
  });

  it('should not remove non-managed entries', () => {
    const settings: any = {
      hooks: {
        Stop: [
          {
            matcher: '',
            hooks: [{ type: 'command', command: 'bash /other/path/hook.sh' }],
          },
        ],
      },
    };
    removeHookFromSettings(settings, 'test');
    expect(settings.hooks.Stop).toHaveLength(1);
  });
});

describe('installScript / uninstallScript', () => {
  it('should copy script to install dir and update settings', () => {
    // 准备源脚本
    const srcDir = path.join(tmpDir, 'source');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'hook.sh'), '#!/bin/bash\n# @claude-extend\n# @name test\n# @type hook\n# @event Stop\n# @description test\n# @version 1.0.0\necho hi');

    installScript(srcDir, 'hook.sh', 'hook', 'test', extendDir, settingsPath);

    // 验证文件已复制
    expect(fs.existsSync(path.join(extendDir, 'hooks', 'test', 'hook.sh'))).toBe(true);

    // 验证 settings.json 已更新
    const settings = readSettings(settingsPath);
    expect(settings.hooks.Stop).toBeDefined();
    expect(settings.hooks.Stop[0].hooks[0].command).toContain('test/hook.sh');
  });

  it('should uninstall script and clean settings', () => {
    // 先安装
    const srcDir = path.join(tmpDir, 'source');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'hook.sh'), '#!/bin/bash\n# @claude-extend\n# @name test\n# @type hook\n# @event Stop\n# @description test\n# @version 1.0.0\necho hi');
    installScript(srcDir, 'hook.sh', 'hook', 'test', extendDir, settingsPath);

    // 再卸载
    uninstallScript('hook', 'test', extendDir, settingsPath);

    // 验证文件已删除
    expect(fs.existsSync(path.join(extendDir, 'hooks', 'test', 'hook.sh'))).toBe(false);

    // 验证 settings.json 已清理
    const settings = readSettings(settingsPath);
    expect(settings.hooks?.Stop).toBeUndefined();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npm test -w @claude-extend/cli
```

Expected: FAIL — `Cannot find module '../installer'`

- [ ] **Step 3: 实现 installer.ts**

```typescript
// packages/cli/src/installer.ts
import * as fs from 'fs';
import * as path from 'path';

interface HookEntry {
  matcher: string;
  hooks: Array<{ type: string; command: string }>;
}

interface Settings {
  [key: string]: any;
  hooks?: Record<string, HookEntry[]>;
}

const MANAGED_PREFIX = '.claude-extend/';

export function getInstallDir(baseDir: string, type: string, name: string): string {
  return path.join(baseDir, `${type}s`, name);
}

export function readSettings(settingsPath: string): Settings {
  try {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  } catch {
    return {};
  }
}

export function writeSettings(settingsPath: string, settings: Settings): void {
  // 创建备份
  if (fs.existsSync(settingsPath)) {
    const backupDir = path.join(path.dirname(settingsPath), 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `settings.json.${timestamp}`);
    fs.copyFileSync(settingsPath, backupPath);
  }

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

export function addHookToSettings(
  settings: Settings,
  event: string,
  command: string
): void {
  if (!settings.hooks) {
    settings.hooks = {};
  }
  if (!settings.hooks[event]) {
    settings.hooks[event] = [];
  }

  // 从命令中提取脚本名
  const scriptName = extractScriptName(command);

  // 移除同名的已有托管条目
  settings.hooks[event] = settings.hooks[event].filter((entry) => {
    return !entry.hooks.some((h) => {
      if (h.command.includes(MANAGED_PREFIX)) {
        return extractScriptName(h.command) === scriptName;
      }
      return false;
    });
  });

  // 添加新条目
  settings.hooks[event].push({
    matcher: '',
    hooks: [{ type: 'command', command }],
  });
}

export function removeHookFromSettings(settings: Settings, name: string): void {
  if (!settings.hooks) return;

  for (const event of Object.keys(settings.hooks)) {
    settings.hooks[event] = settings.hooks[event].filter((entry) => {
      return !entry.hooks.some((h) => {
        if (h.command.includes(MANAGED_PREFIX)) {
          return extractScriptName(h.command) === name;
        }
        return false;
      });
    });

    // 如果事件下没有 hook 了，移除该事件键
    if (settings.hooks[event].length === 0) {
      delete settings.hooks[event];
    }
  }

  // 如果 hooks 对象为空，移除它
  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }
}

function extractScriptName(command: string): string {
  // 从 "bash ~/.claude-extend/hooks/task-notify/hook.sh" 中提取 "task-notify"
  const match = command.match(/\.claude-extend\/\w+\/([^/]+)/);
  return match ? match[1] : '';
}

export function installScript(
  srcDir: string,
  scriptFile: string,
  type: string,
  name: string,
  extendDir: string,
  settingsPath: string
): void {
  const destDir = getInstallDir(extendDir, type, name);
  fs.mkdirSync(destDir, { recursive: true });

  // 复制源目录中所有文件
  const files = fs.readdirSync(srcDir);
  for (const file of files) {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(destDir, file);
    fs.copyFileSync(srcPath, destPath);
    // 保持可执行权限
    fs.chmodSync(destPath, 0o755);
  }

  // 如果是 hook 类型，更新 settings.json
  if (type === 'hook') {
    const settings = readSettings(settingsPath);
    // 重新读取脚本以获取 event
    const scriptContent = fs.readFileSync(path.join(srcDir, scriptFile), 'utf-8');
    const { parseScriptMetadata } = require('./parser');
    const metadata = parseScriptMetadata(scriptContent);

    const command = `bash ${destDir}/${scriptFile}`;
    addHookToSettings(settings, metadata.event!, command);
    writeSettings(settingsPath, settings);
  }
}

export function uninstallScript(
  type: string,
  name: string,
  extendDir: string,
  settingsPath: string
): void {
  const destDir = getInstallDir(extendDir, type, name);
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
  }

  // 从 settings.json 中移除
  const settings = readSettings(settingsPath);
  removeHookFromSettings(settings, name);
  writeSettings(settingsPath, settings);
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npm test -w @claude-extend/cli
```

Expected: 所有测试 PASS

- [ ] **Step 5: 提交**

```bash
git add packages/cli/src/installer.ts packages/cli/src/__tests__/installer.test.ts
git commit -m "feat: implement installer with settings.json safety and tests"
```

---

### Task 5: 实现脚本扫描和发现

**Files:**
- Create: `packages/cli/src/scanner.ts`
- Create: `packages/cli/src/__tests__/scanner.test.ts`

- [ ] **Step 1: 编写 scanner 单元测试**

```typescript
// packages/cli/src/__tests__/scanner.test.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { scanPackages, DiscoveredScript } from '../scanner';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-extend-scan-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('scanPackages', () => {
  it('should discover hook scripts from packages/hooks/', () => {
    const hookDir = path.join(tmpDir, 'packages', 'hooks', 'test-hook');
    fs.mkdirSync(hookDir, { recursive: true });
    fs.writeFileSync(path.join(hookDir, 'hook.sh'), [
      '#!/bin/bash',
      '# @claude-extend',
      '# @name test-hook',
      '# @type hook',
      '# @event Stop',
      '# @description Test hook',
      '# @version 1.0.0',
      'echo test',
    ].join('\n'));

    const results = scanPackages(tmpDir);
    expect(results).toHaveLength(1);
    expect(results[0].metadata.name).toBe('test-hook');
    expect(results[0].metadata.type).toBe('hook');
    expect(results[0].dir).toBe(hookDir);
    expect(results[0].scriptFile).toBe('hook.sh');
  });

  it('should skip directories without valid claude-extend scripts', () => {
    const hookDir = path.join(tmpDir, 'packages', 'hooks', 'bad-hook');
    fs.mkdirSync(hookDir, { recursive: true });
    fs.writeFileSync(path.join(hookDir, 'hook.sh'), '#!/bin/bash\necho no marker');

    const results = scanPackages(tmpDir);
    expect(results).toHaveLength(0);
  });

  it('should scan hooks, agents, and tools subdirectories', () => {
    for (const type of ['hooks', 'agents', 'tools']) {
      const dir = path.join(tmpDir, 'packages', type, `test-${type.slice(0, -1)}`);
      fs.mkdirSync(dir, { recursive: true });
      const scriptName = type === 'hooks' ? 'hook.sh' : type === 'agents' ? 'agent.py' : 'tool.ts';
      const commentPrefix = type === 'tools' ? '//' : '#';
      const eventType = type === 'hooks' ? `\n${commentPrefix} @event Stop` : '';
      fs.writeFileSync(path.join(dir, scriptName), [
        type === 'hooks' ? '#!/bin/bash' : type === 'agents' ? '#!/usr/bin/env python3' : '#!/usr/bin/env node',
        `${commentPrefix} @claude-extend`,
        `${commentPrefix} @name test-${type.slice(0, -1)}`,
        `${commentPrefix} @type ${type.slice(0, -1)}`,
        `${commentPrefix} @description Test ${type.slice(0, -1)}`,
        `${commentPrefix} @version 0.1.0${eventType}`,
        'echo test',
      ].join('\n'));
    }

    const results = scanPackages(tmpDir);
    expect(results).toHaveLength(3);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npm test -w @claude-extend/cli
```

Expected: FAIL — `Cannot find module '../scanner'`

- [ ] **Step 3: 实现 scanner.ts**

```typescript
// packages/cli/src/scanner.ts
import * as fs from 'fs';
import * as path from 'path';
import { parseScriptMetadata, ScriptMetadata } from './parser';

export interface DiscoveredScript {
  metadata: ScriptMetadata;
  dir: string;
  scriptFile: string;
}

// 每种类型下查找脚本文件的优先级
const SCRIPT_FILENAMES: Record<string, string[]> = {
  hooks: ['hook.sh', 'hook.bash', 'hook.py', 'hook.ts'],
  agents: ['agent.sh', 'agent.py', 'agent.ts', 'agent.js'],
  tools: ['tool.sh', 'tool.py', 'tool.ts', 'tool.js'],
};

export function scanPackages(repoRoot: string): DiscoveredScript[] {
  const results: DiscoveredScript[] = [];
  const packagesDir = path.join(repoRoot, 'packages');

  if (!fs.existsSync(packagesDir)) {
    return results;
  }

  for (const typeDir of ['hooks', 'agents', 'tools']) {
    const typePath = path.join(packagesDir, typeDir);
    if (!fs.existsSync(typePath)) continue;

    const entries = fs.readdirSync(typePath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const scriptDir = path.join(typePath, entry.name);
      const candidates = SCRIPT_FILENAMES[typeDir] || [];

      for (const filename of candidates) {
        const scriptPath = path.join(scriptDir, filename);
        if (!fs.existsSync(scriptPath)) continue;

        try {
          const content = fs.readFileSync(scriptPath, 'utf-8');
          const metadata = parseScriptMetadata(content);
          results.push({ metadata, dir: scriptDir, scriptFile: filename });
          break; // 找到第一个有效脚本就停止
        } catch {
          // 无效的头部注释，跳过
        }
      }
    }
  }

  return results;
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npm test -w @claude-extend/cli
```

Expected: 所有测试 PASS

- [ ] **Step 5: 提交**

```bash
git add packages/cli/src/scanner.ts packages/cli/src/__tests__/scanner.test.ts
git commit -m "feat: implement package scanner for discovering scripts"
```

---

### Task 6: 实现完整 CLI 命令

**Files:**
- Modify: `packages/cli/src/index.ts`
- Create: `packages/cli/src/commands/list.ts`
- Create: `packages/cli/src/commands/install.ts`
- Create: `packages/cli/src/commands/uninstall.ts`
- Create: `packages/cli/src/commands/installed.ts`
- Create: `packages/cli/src/commands/info.ts`

- [ ] **Step 1: 实现 list 命令**

```typescript
// packages/cli/src/commands/list.ts
import { scanPackages, DiscoveredScript } from '../scanner';

export function listCommand(type?: string): void {
  const repoRoot = findRepoRoot();
  const scripts = scanPackages(repoRoot);

  const filtered = type ? scripts.filter((s) => s.metadata.type === type) : scripts;

  const hooks = filtered.filter((s) => s.metadata.type === 'hook');
  const agents = filtered.filter((s) => s.metadata.type === 'agent');
  const tools = filtered.filter((s) => s.metadata.type === 'tool');

  if (hooks.length > 0) {
    console.log('Hooks:');
    for (const s of hooks) {
      console.log(`  ${s.metadata.name.padEnd(22)}${(s.metadata.event || '-').padEnd(12)}${s.metadata.description.padEnd(24)}v${s.metadata.version}`);
    }
    console.log();
  }

  if (agents.length > 0) {
    console.log('Agents:');
    for (const s of agents) {
      console.log(`  ${s.metadata.name.padEnd(22)}${'-'.padEnd(12)}${s.metadata.description.padEnd(24)}v${s.metadata.version}`);
    }
    console.log();
  }

  if (tools.length > 0) {
    console.log('Tools:');
    for (const s of tools) {
      console.log(`  ${s.metadata.name.padEnd(22)}${'-'.padEnd(12)}${s.metadata.description.padEnd(24)}v${s.metadata.version}`);
    }
  }

  if (filtered.length === 0) {
    console.log('No scripts found.');
  }
}

function findRepoRoot(): string {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'packages'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}

import * as fs from 'fs';
import * as path from 'path';
```

- [ ] **Step 2: 实现 install 命令**

```typescript
// packages/cli/src/commands/install.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { scanPackages } from '../scanner';
import { installScript } from '../installer';

export function installCommand(name: string): void {
  const repoRoot = findRepoRoot();
  const scripts = scanPackages(repoRoot);
  const script = scripts.find((s) => s.metadata.name === name);

  if (!script) {
    console.error(`Script "${name}" not found. Run "claude-extend list" to see available scripts.`);
    process.exit(1);
  }

  const extendDir = path.join(os.homedir(), '.claude-extend');
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');

  installScript(script.dir, script.scriptFile, script.metadata.type, script.metadata.name, extendDir, settingsPath);

  console.log(`Installed: ${script.metadata.name} (v${script.metadata.version})`);

  // 检查依赖
  if (script.metadata.dependencies.length > 0) {
    const missing = script.metadata.dependencies.filter((dep) => {
      try {
        const { execSync } = require('child_process');
        execSync(`command -v ${dep}`, { stdio: 'ignore' });
        return false;
      } catch {
        return true;
      }
    });

    if (missing.length > 0) {
      console.log(`\nWarning: Missing dependencies: ${missing.join(', ')}`);
      console.log('The script may not work correctly without these.');
    } else {
      console.log('All dependencies satisfied.');
    }
  }
}

function findRepoRoot(): string {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'packages'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}
```

- [ ] **Step 3: 实现 uninstall 命令**

```typescript
// packages/cli/src/commands/uninstall.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { scanPackages } from '../scanner';
import { uninstallScript as doUninstall } from '../installer';

export function uninstallCommand(name: string): void {
  const extendDir = path.join(os.homedir(), '.claude-extend');
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');

  // 先尝试从已安装目录获取类型
  let type = '';
  for (const t of ['hooks', 'agents', 'tools']) {
    if (fs.existsSync(path.join(extendDir, t, name))) {
      type = t.slice(0, -1); // hooks -> hook
      break;
    }
  }

  if (!type) {
    // 回退到从仓库扫描
    const repoRoot = findRepoRoot();
    const scripts = scanPackages(repoRoot);
    const script = scripts.find((s) => s.metadata.name === name);
    if (script) {
      type = script.metadata.type;
    } else {
      console.error(`Script "${name}" is not installed.`);
      process.exit(1);
    }
  }

  doUninstall(type, name, extendDir, settingsPath);
  console.log(`Uninstalled: ${name}`);
}

function findRepoRoot(): string {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'packages'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}
```

- [ ] **Step 4: 实现 installed 命令**

```typescript
// packages/cli/src/commands/installed.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parseScriptMetadata } from '../parser';

export function installedCommand(): void {
  const extendDir = path.join(os.homedir(), '.claude-extend');
  if (!fs.existsSync(extendDir)) {
    console.log('No scripts installed.');
    return;
  }

  const types = ['hooks', 'agents', 'tools'] as const;
  let found = false;

  for (const typeDir of types) {
    const typePath = path.join(extendDir, typeDir);
    if (!fs.existsSync(typePath)) continue;

    const entries = fs.readdirSync(typePath, { withFileTypes: true });
    const installed = entries.filter((e) => e.isDirectory());

    if (installed.length > 0) {
      found = true;
      console.log(`${typeDir.charAt(0).toUpperCase() + typeDir.slice(1)}:`);
      for (const entry of installed) {
        const scriptDir = path.join(typePath, entry.name);
        const files = fs.readdirSync(scriptDir);
        const scriptFile = files.find((f) =>
          f.endsWith('.sh') || f.endsWith('.py') || f.endsWith('.ts') || f.endsWith('.js')
        );
        if (scriptFile) {
          try {
            const content = fs.readFileSync(path.join(scriptDir, scriptFile), 'utf-8');
            const metadata = parseScriptMetadata(content);
            console.log(`  ${metadata.name.padEnd(22)}v${metadata.version.padEnd(10)}${metadata.description}`);
          } catch {
            console.log(`  ${entry.name.padEnd(22)}(metadata unavailable)`);
          }
        }
      }
      console.log();
    }
  }

  if (!found) {
    console.log('No scripts installed.');
  }
}
```

- [ ] **Step 5: 实现 info 命令**

```typescript
// packages/cli/src/commands/info.ts
import { scanPackages } from '../scanner';

export function infoCommand(name: string): void {
  const repoRoot = findRepoRoot();
  const scripts = scanPackages(repoRoot);
  const script = scripts.find((s) => s.metadata.name === name);

  if (!script) {
    console.error(`Script "${name}" not found. Run "claude-extend list" to see available scripts.`);
    process.exit(1);
  }

  const m = script.metadata;
  console.log(`Name:          ${m.name}`);
  console.log(`Type:          ${m.type}`);
  if (m.event) console.log(`Event:         ${m.event}`);
  console.log(`Description:   ${m.description}`);
  console.log(`Version:       ${m.version}`);
  if (m.dependencies.length > 0) {
    console.log(`Dependencies:  ${m.dependencies.join(', ')}`);
  }
  console.log(`Source:        ${script.dir}`);
  console.log(`Entry:         ${script.scriptFile}`);
}

function findRepoRoot(): string {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'packages'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}

import * as fs from 'fs';
import * as path from 'path';
```

- [ ] **Step 6: 更新 CLI 入口 index.ts，注册所有命令**

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { listCommand } from './commands/list';
import { installCommand } from './commands/install';
import { uninstallCommand } from './commands/uninstall';
import { installedCommand } from './commands/installed';
import { infoCommand } from './commands/info';

const program = new Command();

program
  .name('claude-extend')
  .description('Manage Claude Code hooks, agents, and tools')
  .version('0.1.0');

program
  .command('list')
  .description('List available scripts')
  .option('--type <type>', 'Filter by type: hook, agent, tool')
  .action((opts) => {
    listCommand(opts.type);
  });

program
  .command('install <name>')
  .description('Install a script')
  .action((name) => {
    installCommand(name);
  });

program
  .command('uninstall <name>')
  .description('Uninstall a script')
  .action((name) => {
    uninstallCommand(name);
  });

program
  .command('installed')
  .description('List installed scripts')
  .action(() => {
    installedCommand();
  });

program
  .command('info <name>')
  .description('Show script details')
  .action((name) => {
    infoCommand(name);
  });

program.parse();
```

- [ ] **Step 7: 构建并验证 CLI**

```bash
npm run build -w @claude-extend/cli
node packages/cli/dist/index.js --help
node packages/cli/dist/index.js list
```

Expected: 输出帮助信息和空的脚本列表

- [ ] **Step 8: 提交**

```bash
git add packages/cli/src/
git commit -m "feat: implement all CLI commands (list, install, uninstall, installed, info)"
```

---

### Task 7: 迁移 task-completed-notify hook

**Files:**
- Create: `packages/hooks/task-completed-notify/hook.sh`
- Create: `packages/hooks/task-completed-notify/parse_hook.py`
- Create: `packages/hooks/task-completed-notify/save_session.py`
- Create: `packages/hooks/task-completed-notify/notify.py`
- Create: `packages/hooks/task-completed-notify/package.json`

- [ ] **Step 1: 创建 hook 包目录**

```bash
mkdir -p packages/hooks/task-completed-notify
```

- [ ] **Step 2: 复制并修改 hook.sh，添加头部注释**

复制 `/Users/horizon/shell/task-completed-notify/hook.sh` 内容，在文件头部（shebang 之后）添加元数据注释：

```bash
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

# ... (剩余代码与原 hook.sh 完全一致)
```

- [ ] **Step 3: 复制辅助 Python 脚本**

将以下文件原样复制到 `packages/hooks/task-completed-notify/`：
- `parse_hook.py`
- `save_session.py`
- `notify.py`

```bash
cp /Users/horizon/shell/task-completed-notify/parse_hook.py packages/hooks/task-completed-notify/
cp /Users/horizon/shell/task-completed-notify/save_session.py packages/hooks/task-completed-notify/
cp /Users/horizon/shell/task-completed-notify/notify.py packages/hooks/task-completed-notify/
```

- [ ] **Step 4: 创建 hook 的 package.json**

```json
{
  "name": "@claude-extend/hook-task-notify",
  "version": "1.0.0",
  "description": "Send system notification when Claude Code task completes",
  "files": [
    "hook.sh",
    "parse_hook.py",
    "save_session.py",
    "notify.py"
  ]
}
```

- [ ] **Step 5: 安装依赖并构建**

```bash
npm install
npm run build -w @claude-extend/cli
```

Expected: 构建成功

- [ ] **Step 6: 验证 CLI 能发现该 hook**

```bash
node packages/cli/dist/index.js list
node packages/cli/dist/index.js info task-completed-notify
```

Expected: 列表中显示 task-completed-notify，info 输出元数据

- [ ] **Step 7: 提交**

```bash
git add packages/hooks/
git commit -m "feat: migrate task-completed-notify hook with header metadata"
```

---

### Task 8: 创建 install.sh 一键安装脚本

**Files:**
- Create: `scripts/install.sh`

- [ ] **Step 1: 编写 install.sh**

```bash
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
  # 尝试从当前目录向上查找
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
                    m = re.match(r'(?:#\s*|//\s*)@(\w+)\s+(.+)', stripped)
                    if m:
                        metadata[m.group(1)] = m.group(2).strip()
                elif stripped and not stripped.startswith('!'):
                    break

        if 'claude-extend' not in metadata or 'event' not in metadata:
            continue

        event = metadata['event']
        command = f'bash {script_dir}/{entry_file}'

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
            'matcher': '',
            'hooks': [{'type': 'command', 'command': command}]
        })

        print(f'  {event}: {name}')

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
```

- [ ] **Step 2: 设置可执行权限**

```bash
chmod +x scripts/install.sh
```

- [ ] **Step 3: 测试 install.sh**

```bash
bash scripts/install.sh
```

Expected: 输出安装步骤，符号链接创建成功，settings.json 更新

- [ ] **Step 4: 验证安装结果**

```bash
ls -la ~/.claude-extend/hooks/
cat ~/.claude/settings.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps(d.get('hooks',{}), indent=2))"
```

Expected: 符号链接指向仓库目录，settings.json 包含 Stop hook 条目

- [ ] **Step 5: 提交**

```bash
git add scripts/install.sh
git commit -m "feat: add bulk install script with symlinks and settings merge"
```

---

### Task 9: 创建 README.md

**Files:**
- Create: `README.md`

- [ ] **Step 1: 编写 README.md**

```markdown
# claude-code-extend

Claude Code hooks、agents 和工具脚本管理器。每个脚本独立安装，支持元数据驱动的发现和配置。

## 快速安装

```bash
# 一键安装所有脚本（符号链接方式，git pull 即更新）
git clone https://github.com/<user>/claude-code-extend.git
cd claude-code-extend
./scripts/install.sh
```

或通过 curl：
```bash
curl -fsSL https://raw.githubusercontent.com/<user>/claude-code-extend/main/scripts/install.sh | bash -s -- --repo /path/to/claude-code-extend
```

## 单脚本安装（npm）

```bash
npx claude-extend install task-completed-notify
```

## CLI 命令

```bash
claude-extend list                    # 列出可用脚本
claude-extend list --type hook        # 只列出 hooks
claude-extend install <name>          # 安装脚本
claude-extend uninstall <name>        # 卸载脚本
claude-extend installed               # 列出已安装脚本
claude-extend info <name>             # 查看脚本详情
```

## 可用脚本

| 名称 | 类型 | 事件 | 说明 |
|------|------|------|------|
| task-completed-notify | hook | Stop | 任务完成时发送系统通知 |

## 添加新脚本

1. 在 `packages/<type>/<name>/` 下创建脚本文件
2. 在文件头部添加元数据注释：

```bash
#!/bin/bash
# @claude-extend
# @name my-new-hook
# @type hook
# @event PreToolUse
# @description 我的新 hook
# @version 0.1.0
```

3. 创建 `package.json`：
```json
{
  "name": "@claude-extend/hook-my-new-hook",
  "version": "0.1.0",
  "description": "My new hook"
}
```

4. 运行 `npm install` 注册到 workspaces
5. 提交代码

## 元数据字段

| 字段 | 必填 | 说明 |
|------|------|------|
| `@claude-extend` | 是 | 标记为 claude-extend 脚本 |
| `@name` | 是 | 唯一标识符 |
| `@type` | 是 | hook / agent / tool |
| `@event` | hook 必填 | Stop / PreToolUse / PostToolUse / Notification / SubagentStop |
| `@description` | 是 | 描述 |
| `@dependencies` | 否 | 依赖的系统命令，逗号分隔 |
| `@version` | 是 | 语义化版本 |

## 安装目录

脚本安装到 `~/.claude-extend/`，不污染 `~/.claude/`：

```
~/.claude-extend/
├── hooks/
│   └── task-completed-notify/ -> /path/to/repo/packages/hooks/task-completed-notify/
├── agents/
└── tools/
```

## 开发

```bash
npm install          # 安装依赖
npm run build        # 构建 CLI
npm test             # 运行测试
```
```

- [ ] **Step 2: 提交**

```bash
git add README.md
git commit -m "docs: add project README with installation and usage guide"
```

---

### Task 10: 端到端验证

- [ ] **Step 1: 完整构建**

```bash
npm run build
npm test
```

Expected: 构建成功，所有测试通过

- [ ] **Step 2: 验证 CLI list 命令**

```bash
node packages/cli/dist/index.js list
```

Expected: 输出 task-completed-notify hook 信息

- [ ] **Step 3: 验证 CLI info 命令**

```bash
node packages/cli/dist/index.js info task-completed-notify
```

Expected: 输出完整的脚本元数据

- [ ] **Step 4: 验证 install.sh 执行**

```bash
bash scripts/install.sh
```

Expected: 安装成功，符号链接创建，settings.json 更新

- [ ] **Step 5: 验证 settings.json 正确性**

```bash
python3 -c "import json; d=json.load(open('$HOME/.claude/settings.json')); print(json.dumps(d.get('hooks',{}), indent=2))"
```

Expected: Stop 事件中有 claude-extend 托管的 hook 条目

- [ ] **Step 6: 验证 uninstall 命令**

```bash
node packages/cli/dist/index.js uninstall task-completed-notify
```

Expected: 输出 "Uninstalled: task-completed-notify"，settings.json 中 Stop 条目被移除

- [ ] **Step 7: 重新安装以恢复状态**

```bash
bash scripts/install.sh
```

Expected: 重新安装成功

- [ ] **Step 8: 最终提交（如有改动）**

```bash
git add -A
git status
# 仅提交实际改动，不提交 node_modules/dist 等
git commit -m "chore: e2e verification complete"
```
