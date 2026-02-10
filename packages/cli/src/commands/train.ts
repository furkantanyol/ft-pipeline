import type { Command } from 'commander';

export function registerTrain(program: Command): void {
  program
    .command('train')
    .description('Start a fine-tuning job')
    .option('--epochs <n>', 'Number of training epochs', '3')
    .option('--batch-size <n>', 'Batch size', '4')
    .option('--learning-rate <rate>', 'Learning rate', '1e-5')
    .option('--lora-r <rank>', 'LoRA rank', '16')
    .option('--lora-alpha <alpha>', 'LoRA alpha', '32')
    .action(async () => {
      // TODO: upload training file to provider
      // TODO: create fine-tune job
      // TODO: save job ID to config
      console.log('TODO: implement train command');
    });
}
