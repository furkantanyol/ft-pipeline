import type { Command } from 'commander';

export function registerRate(program: Command): void {
  program
    .command('rate')
    .description('Rate and review training examples')
    .option('--min <rating>', 'Only show examples rated below this threshold', '0')
    .action(async () => {
      // TODO: show unrated examples interactively
      // TODO: rate 1-10, rewrite option, skip option
      // TODO: summary stats after session
      console.log('TODO: implement rate command');
    });
}
