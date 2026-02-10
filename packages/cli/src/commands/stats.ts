import type { Command } from 'commander';

export function registerStats(program: Command): void {
  program
    .command('stats')
    .description('Show dataset health overview')
    .action(async () => {
      // TODO: total examples, rated/unrated counts
      // TODO: rating distribution histogram
      // TODO: train/val split status
      // TODO: readiness assessment
      console.log('TODO: implement stats command');
    });
}
