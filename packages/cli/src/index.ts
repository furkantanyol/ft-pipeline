#!/usr/bin/env node

import { Command } from 'commander';
import { registerInit } from './commands/init.js';
import { registerAdd } from './commands/add.js';
import { registerRate } from './commands/rate.js';
import { registerStats } from './commands/stats.js';
import { registerFormat } from './commands/format.js';
import { registerSplit } from './commands/split.js';
import { registerTrain } from './commands/train.js';
import { registerEval } from './commands/eval.js';
import { registerStatus } from './commands/status.js';
import { logo, text } from './utils/ui.js';

const program = new Command();

// Show logo only when --help is called or no args
const showBanner =
  process.argv.length === 2 || process.argv.includes('--help') || process.argv.includes('-h');

if (showBanner) {
  console.log(logo());
  console.log('');
}

program
  .name('ait')
  .description('Your AI atelier — craft fine-tuned models with an intuitive CLI')
  .version('0.3.0', '-v, --version', 'Output the current version')
  .addHelpText(
    'after',
    '\n' +
      text.highlight('Quick Start:') +
      '\n' +
      text.muted('  $ ') +
      text.command('ait init') +
      text.muted('   — Initialize a new project') +
      '\n' +
      text.muted('  $ ') +
      text.command('ait add') +
      text.muted('    — Add training examples') +
      '\n' +
      text.muted('  $ ') +
      text.command('ait stats') +
      text.muted('  — Check dataset health') +
      '\n' +
      text.muted('  $ ') +
      text.command('ait train') +
      text.muted('  — Start fine-tuning') +
      '\n\n' +
      text.info('Learn more: https://github.com/furkantanyol/aitelier') +
      '\n',
  );

registerInit(program);
registerAdd(program);
registerRate(program);
registerStats(program);
registerFormat(program);
registerSplit(program);
registerTrain(program);
registerEval(program);
registerStatus(program);

program.parse();
