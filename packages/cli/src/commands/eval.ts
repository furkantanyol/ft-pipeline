import type { Command } from 'commander';

export function registerEval(program: Command): void {
  program
    .command('eval')
    .description('Evaluate fine-tuned model on validation set')
    .option('--compare <baseline>', 'Compare against base model')
    .action(async () => {
      // TODO: run model on validation examples
      // TODO: side-by-side display
      // TODO: interactive scoring
      // TODO: save results to data/evals/
      console.log('TODO: implement eval command');
    });
}
