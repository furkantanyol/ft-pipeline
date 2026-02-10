import type { Command } from 'commander';

export function registerAdd(program: Command): void {
  program
    .command('add')
    .description('Add a training example')
    .option('--input <file>', 'Input file (user message)')
    .option('--output <file>', 'Output file (assistant message)')
    .action(async () => {
      // TODO: interactive mode — paste input, paste output, rate
      // TODO: file mode — read from --input and --output
      // TODO: append to data/examples.jsonl with metadata
      console.log('TODO: implement add command');
    });
}
