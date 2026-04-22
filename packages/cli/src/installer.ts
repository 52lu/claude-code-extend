import * as fs from 'fs';
import * as path from 'path';
import { parseScriptMetadata } from './parser';

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

  const scriptName = extractScriptName(command);

  settings.hooks[event] = settings.hooks[event].filter((entry) => {
    return !entry.hooks.some((h) => {
      if (h.command.includes(MANAGED_PREFIX)) {
        return extractScriptName(h.command) === scriptName;
      }
      return false;
    });
  });

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

    if (settings.hooks[event].length === 0) {
      delete settings.hooks[event];
    }
  }

  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }
}

function extractScriptName(command: string): string {
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

  const files = fs.readdirSync(srcDir);
  for (const file of files) {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(destDir, file);
    fs.copyFileSync(srcPath, destPath);
    fs.chmodSync(destPath, 0o755);
  }

  if (type === 'hook') {
    const settings = readSettings(settingsPath);
    const scriptContent = fs.readFileSync(path.join(srcDir, scriptFile), 'utf-8');
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

  const settings = readSettings(settingsPath);
  removeHookFromSettings(settings, name);
  writeSettings(settingsPath, settings);
}
