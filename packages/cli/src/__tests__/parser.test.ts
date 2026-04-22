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
