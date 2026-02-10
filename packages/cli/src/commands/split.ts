import type { Command } from 'commander';

export function registerSplit(program: Command): void {
  program
    .command('split')
    .description('Manage train/validation split')
    .option('--ratio <ratio>', 'Train ratio (default 0.8)', '0.8')
    .option('--reshuffle', 'Force re-split with confirmation')
    .action(async () => {
      // TODO: auto-split 80/20 by default
      // TODO: stratify by rating if enough examples
      // TODO: lock validation set
      console.log('TODO: implement split command');
    });
}
