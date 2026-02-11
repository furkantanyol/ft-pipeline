import type { Command } from 'commander';
import inquirer from 'inquirer';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import type { Example } from '../storage/dataset.js';
import { readExamples, writeExamples } from '../storage/dataset.js';

const CONFIG_FILE = '.aitelier.json';
const EXAMPLES_FILE = 'data/examples.jsonl';

interface SessionStats {
  shown: number;
  rated: number;
  rewritten: number;
  skipped: number;
  ratings: number[];
}

export function registerRate(program: Command): void {
  program
    .command('rate')
    .description('Rate and optionally rewrite training examples')
    .option(
      '--min <rating>',
      'Minimum rating threshold (show unrated + examples below threshold)',
      '0',
    )
    .action(async (options: { min: string }) => {
      try {
        await rateCommand(options);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}

async function rateCommand(options: { min: string }): Promise<void> {
  const cwd = process.cwd();

  // Check if project is initialized
  try {
    await access(join(cwd, CONFIG_FILE));
  } catch {
    throw new Error('Project not initialized. Run `ait init` first to create .aitelier.json');
  }

  // Parse and validate --min flag
  const minRating = parseFloat(options.min);
  if (isNaN(minRating) || minRating < 0 || minRating > 10) {
    throw new Error('--min must be a number between 0 and 10');
  }

  // Load all examples
  const examplesPath = join(cwd, EXAMPLES_FILE);
  let examples: Example[];
  try {
    examples = await readExamples(examplesPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log('No examples found. Add examples with `ait add` first.');
      return;
    }
    throw error;
  }

  // Check if file has any examples
  if (examples.length === 0) {
    console.log('No examples found. Add examples with `ait add` first.');
    return;
  }

  // Filter examples to rate
  const toRate = filterExamples(examples, minRating);

  if (toRate.length === 0) {
    if (minRating === 0) {
      console.log('No unrated examples found. All examples have been rated.');
    } else {
      console.log(`No examples to rate. All examples are rated ${minRating} or higher.`);
    }
    return;
  }

  // Initialize session stats
  const stats: SessionStats = {
    shown: 0,
    rated: 0,
    rewritten: 0,
    skipped: 0,
    ratings: [],
  };

  // Main rating loop
  for (const example of toRate) {
    stats.shown++;
    displayExample(example);

    const action = await promptAction();

    if (action === 'quit') {
      console.log('\nQuitting...');
      break;
    }

    if (action === 'skip') {
      stats.skipped++;
      continue;
    }

    if (action === 'rate') {
      const rating = await promptRating();
      example.rating = rating;
      stats.rated++;
      stats.ratings.push(rating);
      console.log(`✓ Rated as ${rating}/10\n`);
    }

    if (action === 'rewrite') {
      const assistantMsg = example.messages.find((m) => m.role === 'assistant');
      if (!assistantMsg) {
        console.log('No assistant message found in this example. Skipping rewrite.\n');
        continue;
      }

      const newOutput = await promptRewrite(assistantMsg.content);

      // Save original output on first rewrite only
      if (!example.originalOutput) {
        example.originalOutput = assistantMsg.content;
      }

      // Update assistant message
      assistantMsg.content = newOutput;
      stats.rewritten++;

      // Prompt for rating after rewrite
      const rating = await promptRating();
      example.rating = rating;
      stats.rated++;
      stats.ratings.push(rating);
      console.log(`✓ Rewritten and rated as ${rating}/10\n`);
    }
  }

  // Write all changes back to file
  await writeExamples(examplesPath, examples);

  // Display session summary
  displaySummary(stats);
}

function filterExamples(examples: Example[], minRating: number): Example[] {
  return examples
    .filter((e) => e.rating === null || e.rating < minRating)
    .sort((a, b) => a.id - b.id);
}

function displayExample(example: Example): void {
  console.log(`\nExample #${example.id}`);
  console.log('━'.repeat(70));

  for (const msg of example.messages) {
    const label = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
    console.log(`${label}: ${msg.content}`);
  }

  console.log('━'.repeat(70));

  const ratingText = example.rating === null ? 'unrated' : `${example.rating}/10`;
  console.log(`Current rating: ${ratingText}`);

  if (example.originalOutput) {
    console.log('(This example has been rewritten)');
  }
}

async function promptAction(): Promise<'rate' | 'rewrite' | 'skip' | 'quit'> {
  const answer = await inquirer.prompt<{ action: 'rate' | 'rewrite' | 'skip' | 'quit' }>([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: 'Rate this example', value: 'rate' },
        { name: 'Rewrite assistant output', value: 'rewrite' },
        { name: 'Skip', value: 'skip' },
        { name: 'Quit', value: 'quit' },
      ],
    },
  ]);

  return answer.action;
}

async function promptRating(): Promise<number> {
  const answer = await inquirer.prompt<{ rating: string }>([
    {
      type: 'input',
      name: 'rating',
      message: 'Rate this example (1-10):',
      validate: (input: string) => {
        const num = parseFloat(input);
        if (isNaN(num)) {
          return 'Please enter a valid number';
        }
        if (num < 1 || num > 10) {
          return 'Rating must be between 1 and 10';
        }
        if (!Number.isInteger(num)) {
          return 'Rating must be a whole number';
        }
        return true;
      },
    },
  ]);

  return parseInt(answer.rating, 10);
}

async function promptRewrite(currentOutput: string): Promise<string> {
  const answer = await inquirer.prompt<{ output: string }>([
    {
      type: 'editor',
      name: 'output',
      message: 'Edit the assistant output:',
      default: currentOutput,
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Output cannot be empty';
        }
        return true;
      },
    },
  ]);

  return answer.output.trim();
}

function displaySummary(stats: SessionStats): void {
  console.log('\n' + '═'.repeat(70));
  console.log('Rating Session Complete');
  console.log('═'.repeat(70));
  console.log(`Examples shown: ${stats.shown}`);
  console.log(`Rated: ${stats.rated}`);
  console.log(`Rewritten: ${stats.rewritten}`);
  console.log(`Skipped: ${stats.skipped}`);

  if (stats.ratings.length > 0) {
    const avg = stats.ratings.reduce((sum, r) => sum + r, 0) / stats.ratings.length;
    console.log(`Average rating: ${avg.toFixed(1)}/10`);
  }

  console.log('═'.repeat(70));
}
