#!/usr/bin/env node
import { Command } from 'commander';
import { listCommand } from './commands/list';
import { installCommand } from './commands/install';
import { uninstallCommand } from './commands/uninstall';
import { installedCommand } from './commands/installed';
import { infoCommand } from './commands/info';

const program = new Command();

program
  .name('claude-extend')
  .description('Manage Claude Code hooks, agents, and tools')
  .version('0.1.0');

program
  .command('list')
  .description('List available scripts')
  .option('--type <type>', 'Filter by type: hook, agent, tool')
  .action((opts) => {
    listCommand(opts.type);
  });

program
  .command('install <name>')
  .description('Install a script')
  .action((name) => {
    installCommand(name);
  });

program
  .command('uninstall <name>')
  .description('Uninstall a script')
  .action((name) => {
    uninstallCommand(name);
  });

program
  .command('installed')
  .description('List installed scripts')
  .action(() => {
    installedCommand();
  });

program
  .command('info <name>')
  .description('Show script details')
  .action((name) => {
    infoCommand(name);
  });

program.parse();
