#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command();

program
  .name('claude-extend')
  .description('Manage Claude Code hooks, agents, and tools')
  .version('0.1.0');

// TODO: 注册子命令（后续 task 实现）
program
  .command('list')
  .description('List available scripts')
  .option('--type <type>', 'Filter by type: hook, agent, tool')
  .action(() => {
    console.log('list command - not yet implemented');
  });

program
  .command('install <name>')
  .description('Install a script')
  .action(() => {
    console.log('install command - not yet implemented');
  });

program
  .command('uninstall <name>')
  .description('Uninstall a script')
  .action(() => {
    console.log('uninstall command - not yet implemented');
  });

program
  .command('installed')
  .description('List installed scripts')
  .action(() => {
    console.log('installed command - not yet implemented');
  });

program
  .command('info <name>')
  .description('Show script details')
  .action(() => {
    console.log('info command - not yet implemented');
  });

program.parse();
