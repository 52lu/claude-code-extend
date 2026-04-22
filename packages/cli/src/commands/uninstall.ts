import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { scanPackages } from '../scanner';
import { uninstallScript as doUninstall } from '../installer';
import { findRepoRoot } from './list';

export function uninstallCommand(name: string): void {
  const extendDir = path.join(os.homedir(), '.claude-extend');
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');

  let type = '';
  for (const t of ['hooks', 'agents', 'tools']) {
    if (fs.existsSync(path.join(extendDir, t, name))) {
      type = t.slice(0, -1);
      break;
    }
  }

  if (!type) {
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
