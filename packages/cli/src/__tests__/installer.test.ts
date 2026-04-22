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
    expect(settings.hooks?.Stop).toBeUndefined();
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
    expect(settings.hooks?.Stop).toBeUndefined();
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
    const srcDir = path.join(tmpDir, 'source');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'hook.sh'), '#!/bin/bash\n# @claude-extend\n# @name test\n# @type hook\n# @event Stop\n# @description test\n# @version 1.0.0\necho hi');

    installScript(srcDir, 'hook.sh', 'hook', 'test', extendDir, settingsPath);

    expect(fs.existsSync(path.join(extendDir, 'hooks', 'test', 'hook.sh'))).toBe(true);

    const settings = readSettings(settingsPath);
    expect(settings.hooks!.Stop).toBeDefined();
    expect(settings.hooks!.Stop[0].hooks[0].command).toContain('test/hook.sh');
  });

  it('should uninstall script and clean settings', () => {
    const srcDir = path.join(tmpDir, 'source');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'hook.sh'), '#!/bin/bash\n# @claude-extend\n# @name test\n# @type hook\n# @event Stop\n# @description test\n# @version 1.0.0\necho hi');
    installScript(srcDir, 'hook.sh', 'hook', 'test', extendDir, settingsPath);

    uninstallScript('hook', 'test', extendDir, settingsPath);

    expect(fs.existsSync(path.join(extendDir, 'hooks', 'test', 'hook.sh'))).toBe(false);

    const settings = readSettings(settingsPath);
    expect(settings.hooks?.Stop).toBeUndefined();
  });
});
