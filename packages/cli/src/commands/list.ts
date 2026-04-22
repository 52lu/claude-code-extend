import * as fs from 'fs';
import * as path from 'path';
import { scanPackages } from '../scanner';

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

export function findRepoRoot(): string {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'packages'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}
