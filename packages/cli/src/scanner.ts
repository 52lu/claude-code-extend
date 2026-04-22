import * as fs from 'fs';
import * as path from 'path';
import { parseScriptMetadata, ScriptMetadata } from './parser';

export interface DiscoveredScript {
  metadata: ScriptMetadata;
  dir: string;
  scriptFile: string;
}

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
          break;
        } catch {
          // invalid header comments, skip
        }
      }
    }
  }

  return results;
}
