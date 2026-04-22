import { scanPackages } from '../scanner';
import { findRepoRoot } from './list';

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
  if (m.matcher) console.log(`Matcher:       ${m.matcher}`);
  console.log(`Description:   ${m.description}`);
  console.log(`Version:       ${m.version}`);
  if (m.dependencies.length > 0) {
    console.log(`Dependencies:  ${m.dependencies.join(', ')}`);
  }
  console.log(`Source:        ${script.dir}`);
  console.log(`Entry:         ${script.scriptFile}`);
}
