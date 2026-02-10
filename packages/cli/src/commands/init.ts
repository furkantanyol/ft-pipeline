import type { Command } from 'commander';

export function registerInit(program: Command): void {
  program
    .command('init')
    .description('Initialize a new fine-tuning project')
    .action(async () => {
      // TODO: interactive prompts for project name, provider, model, system prompt
      // TODO: generate .ftpipeline.json
      // TODO: create data/ directory with examples.jsonl, train.jsonl, val.jsonl
      console.log('TODO: implement init command');
    });
}
