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

const program = new Command();

program
  .name('ait')
  .description('CLI for collecting, rating, formatting, and iterating on LLM fine-tuning datasets')
  .version('0.2.0');

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
