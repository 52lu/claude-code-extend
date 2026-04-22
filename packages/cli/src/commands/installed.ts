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
