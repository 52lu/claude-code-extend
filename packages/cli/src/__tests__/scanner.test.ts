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
