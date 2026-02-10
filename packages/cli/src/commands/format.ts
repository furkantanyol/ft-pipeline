import type { Command } from 'commander';

export function registerFormat(program: Command): void {
  program
    .command('format')
    .description('Export examples to provider-specific JSONL format')
    .option('--provider <name>', 'Target provider (together, openai)')
    .option('--min-rating <rating>', 'Minimum rating threshold', '8')
    .action(async () => {
      // TODO: filter by rating threshold
      // TODO: export to provider-specific format
      // TODO: write train.jsonl and val.jsonl
      console.log('TODO: implement format command');
    });
}
