import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { scanPackages } from '../scanner';
import { installScript } from '../installer';
import { findRepoRoot } from './list';
import { execSync } from 'child_process';

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

  if (script.metadata.dependencies.length > 0) {
    const missing = script.metadata.dependencies.filter((dep) => {
      try {
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
