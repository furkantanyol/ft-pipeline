import type { Command } from 'commander';

export function registerStatus(program: Command): void {
  program
    .command('status')
    .description('Check fine-tuning job status')
    .option('--all', 'Show all runs')
    .action(async () => {
      // TODO: check latest job status via provider API
      // TODO: --all shows all runs with model IDs
      // TODO: save model ID to config when complete
      console.log('TODO: implement status command');
    });
}
