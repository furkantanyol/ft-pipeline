import type { Command } from 'commander';
import inquirer from 'inquirer';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import type { Message } from '../providers/types.js';
import type { Example } from '../storage/dataset.js';
import { readExamples, writeExamples, appendExample } from '../storage/dataset.js';
import { loadConfig } from '../storage/config.js';
import { createTable, section, divider, ratingBar, colors, text, metric } from '../utils/ui.js';

const CONFIG_FILE = '.aitelier.json';
const EXAMPLES_FILE = 'data/examples.jsonl';
const PAGE_SIZE = 15;

interface ListOptions {
  rated?: boolean;
  unrated?: boolean;
  min?: string;
  max?: string;
  split?: string;
  json?: boolean;
  interactive?: boolean;
}

export function registerList(program: Command): void {
  program
    .command('list')
    .description('Browse, view, edit, and manage training examples')
    .option('--rated', 'Show only rated examples')
    .option('--unrated', 'Show only unrated examples')
    .option('--min <n>', 'Minimum rating filter (1-10)')
    .option('--max <n>', 'Maximum rating filter (1-10)')
    .option('--split <type>', 'Filter by split: train, val, none')
    .option('--json', 'Output as JSON and exit (non-interactive)')
    .option('--no-interactive', 'Print table and exit')
    .action(async (options: ListOptions) => {
      try {
        await listCommand(options);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}

function filterExamples(examples: Example[], options: ListOptions): Example[] {
  let filtered = [...examples];

  if (options.rated) {
    filtered = filtered.filter((e) => e.rating !== null);
  }

  if (options.unrated) {
    filtered = filtered.filter((e) => e.rating === null);
  }

  if (options.min !== undefined) {
    const min = parseFloat(options.min);
    if (isNaN(min) || min < 1 || min > 10) {
      throw new Error('--min must be a number between 1 and 10');
    }
    filtered = filtered.filter((e) => e.rating !== null && e.rating >= min);
  }

  if (options.max !== undefined) {
    const max = parseFloat(options.max);
    if (isNaN(max) || max < 1 || max > 10) {
      throw new Error('--max must be a number between 1 and 10');
    }
    filtered = filtered.filter((e) => e.rating !== null && e.rating <= max);
  }

  if (options.split !== undefined) {
    if (!['train', 'val', 'none'].includes(options.split)) {
      throw new Error('--split must be one of: train, val, none');
    }
    if (options.split === 'none') {
      filtered = filtered.filter((e) => e.split === undefined);
    } else {
      filtered = filtered.filter((e) => e.split === options.split);
    }
  }

  return filtered.sort((a, b) => a.id - b.id);
}

function truncate(str: string, maxLen: number): string {
  const oneLine = str.replace(/\n/g, ' ').trim();
  if (oneLine.length <= maxLen) return oneLine;
  return oneLine.slice(0, maxLen - 1) + '\u2026';
}

function getMessageContent(example: Example, role: 'user' | 'assistant' | 'system'): string {
  const msg = example.messages.find((m) => m.role === role);
  return msg?.content ?? '';
}

function renderTable(examples: Example[], page: number): void {
  const start = page * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, examples.length);
  const pageExamples = examples.slice(start, end);
  const totalPages = Math.ceil(examples.length / PAGE_SIZE);

  section(`Examples (${examples.length} total — page ${page + 1}/${totalPages})`);

  const table = createTable(['ID', 'User Message', 'Assistant Message', 'Rating', 'Split', 'Ver']);

  for (const ex of pageExamples) {
    const userMsg = truncate(getMessageContent(ex, 'user'), 35);
    const assistantMsg = truncate(getMessageContent(ex, 'assistant'), 35);
    const rating = ex.rating !== null ? ratingBar(ex.rating) : colors.muted('unrated');
    const split = ex.split
      ? ex.split === 'train'
        ? colors.info(ex.split)
        : colors.warning(ex.split)
      : colors.muted('—');
    const version = colors.dim(`v${ex.version}`);

    table.push([String(ex.id), userMsg, assistantMsg, rating, split, version]);
  }

  console.log(table.toString());
}

function displayDetail(example: Example): void {
  section(`Example #${example.id}`);

  for (const msg of example.messages) {
    const label = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
    const color =
      msg.role === 'system' ? colors.muted : msg.role === 'user' ? colors.info : colors.success;
    console.log(color(`[${label}]`));
    console.log(msg.content);
    divider();
  }

  const ratingText =
    example.rating !== null
      ? `${ratingBar(example.rating)}  ${example.rating}/10`
      : colors.muted('unrated');

  console.log(metric('Rating', ratingText));
  console.log(metric('Version', `v${example.version}`));
  console.log(metric('Split', example.split ?? 'none'));
  console.log(metric('Created', example.createdAt));

  if (example.originalOutput) {
    console.log(colors.muted('\n(This example has been rewritten)'));
  }
}

async function listCommand(options: ListOptions): Promise<void> {
  const cwd = process.cwd();

  // Check if project is initialized
  try {
    await access(join(cwd, CONFIG_FILE));
  } catch {
    throw new Error('Project not initialized. Run `ait init` first to create .aitelier.json');
  }

  // Load all examples
  const examplesPath = join(cwd, EXAMPLES_FILE);
  let allExamples: Example[];
  try {
    allExamples = await readExamples(examplesPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log('No examples found. Add examples with `ait add` first.');
      return;
    }
    throw error;
  }

  if (allExamples.length === 0) {
    console.log('No examples found. Add examples with `ait add` first.');
    return;
  }

  // Apply filters
  const filtered = filterExamples(allExamples, options);

  if (filtered.length === 0) {
    console.log('No examples match the given filters.');
    return;
  }

  // JSON output mode
  if (options.json) {
    console.log(JSON.stringify(filtered, null, 2));
    return;
  }

  // Non-interactive mode
  if (options.interactive === false) {
    renderTable(filtered, 0);
    // Print all pages
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    for (let p = 1; p < totalPages; p++) {
      renderTable(filtered, p);
    }
    return;
  }

  // Interactive mode
  let currentPage = 0;
  let running = true;

  while (running) {
    renderTable(filtered, currentPage);
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

    const choices: Array<{ name: string; value: string }> = [
      { name: 'View example by ID', value: 'view' },
    ];

    if (currentPage < totalPages - 1) {
      choices.push({ name: 'Next page', value: 'next' });
    }
    if (currentPage > 0) {
      choices.push({ name: 'Previous page', value: 'prev' });
    }

    choices.push({ name: 'Add new example', value: 'add' });
    choices.push({ name: 'Quit', value: 'quit' });

    const { action } = await inquirer.prompt<{ action: string }>([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices,
      },
    ]);

    if (action === 'quit') {
      running = false;
    } else if (action === 'next') {
      currentPage++;
    } else if (action === 'prev') {
      currentPage--;
    } else if (action === 'view') {
      await viewExample(filtered, allExamples, examplesPath);
    } else if (action === 'add') {
      await addExample(allExamples, examplesPath, cwd);
      // Re-read and re-filter after add
      allExamples = await readExamples(examplesPath);
      const newFiltered = filterExamples(allExamples, options);
      filtered.length = 0;
      filtered.push(...newFiltered);
    }
  }
}

async function viewExample(
  filtered: Example[],
  allExamples: Example[],
  examplesPath: string,
): Promise<void> {
  const filteredIds = filtered.map((e) => e.id);

  const { id } = await inquirer.prompt<{ id: string }>([
    {
      type: 'input',
      name: 'id',
      message: 'Enter example ID:',
      validate: (input: string) => {
        const num = parseInt(input, 10);
        if (isNaN(num)) return 'Please enter a valid number';
        if (!filteredIds.includes(num)) return `No example with ID ${num} in current view`;
        return true;
      },
    },
  ]);

  const exampleId = parseInt(id, 10);
  const example = allExamples.find((e) => e.id === exampleId)!;

  let inDetail = true;
  while (inDetail) {
    displayDetail(example);

    const { action } = await inquirer.prompt<{ action: string }>([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Edit user message', value: 'edit-user' },
          { name: 'Edit assistant message', value: 'edit-assistant' },
          { name: 'Edit system message', value: 'edit-system' },
          { name: 'Re-rate', value: 'rate' },
          { name: 'Delete', value: 'delete' },
          { name: 'Back to list', value: 'back' },
        ],
      },
    ]);

    if (action === 'back') {
      inDetail = false;
    } else if (action === 'rate') {
      const { rating } = await inquirer.prompt<{ rating: string }>([
        {
          type: 'input',
          name: 'rating',
          message: 'Rate this example (1-10):',
          validate: (input: string) => {
            const num = parseFloat(input);
            if (isNaN(num)) return 'Please enter a valid number';
            if (num < 1 || num > 10) return 'Rating must be between 1 and 10';
            if (!Number.isInteger(num)) return 'Rating must be a whole number';
            return true;
          },
        },
      ]);
      example.rating = parseInt(rating, 10);
      await writeExamples(examplesPath, allExamples);
      console.log(text.success(`Rated example #${example.id} as ${example.rating}/10`));
    } else if (action === 'delete') {
      const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Delete example #${example.id}? This cannot be undone.`,
          default: false,
        },
      ]);
      if (confirm) {
        const idx = allExamples.findIndex((e) => e.id === example.id);
        allExamples.splice(idx, 1);
        // Also remove from filtered view
        const filteredIdx = filtered.findIndex((e) => e.id === example.id);
        if (filteredIdx !== -1) filtered.splice(filteredIdx, 1);
        await writeExamples(examplesPath, allExamples);
        console.log(text.success(`Deleted example #${example.id}`));
        inDetail = false;
      }
    } else if (action.startsWith('edit-')) {
      const role = action.replace('edit-', '') as 'user' | 'assistant' | 'system';
      const msg = example.messages.find((m) => m.role === role);

      if (!msg) {
        console.log(colors.warning(`No ${role} message found in this example.`));
        continue;
      }

      const { content } = await inquirer.prompt<{ content: string }>([
        {
          type: 'editor',
          name: 'content',
          message: `Edit ${role} message:`,
          default: msg.content,
          validate: (input: string) => {
            if (!input.trim()) return 'Message content cannot be empty';
            return true;
          },
        },
      ]);

      msg.content = content.trim();
      example.version++;
      await writeExamples(examplesPath, allExamples);
      console.log(
        text.success(`Updated ${role} message for example #${example.id} (v${example.version})`),
      );
    }
  }
}

async function addExample(
  allExamples: Example[],
  examplesPath: string,
  cwd: string,
): Promise<void> {
  const config = await loadConfig(cwd);

  const { input } = await inquirer.prompt<{ input: string }>([
    {
      type: 'editor',
      name: 'input',
      message: 'Enter the input (user message):',
      validate: (val: string) => {
        if (!val.trim()) return 'Input cannot be empty';
        return true;
      },
    },
  ]);

  const { output } = await inquirer.prompt<{ output: string }>([
    {
      type: 'editor',
      name: 'output',
      message: 'Enter the output (assistant response):',
      validate: (val: string) => {
        if (!val.trim()) return 'Output cannot be empty';
        return true;
      },
    },
  ]);

  const messages: Message[] = [];

  if (config.systemPrompt) {
    messages.push({ role: 'system', content: config.systemPrompt });
  }

  messages.push({ role: 'user', content: input.trim() });
  messages.push({ role: 'assistant', content: output.trim() });

  const nextId = allExamples.length > 0 ? Math.max(...allExamples.map((e) => e.id)) + 1 : 1;

  const example: Example = {
    id: nextId,
    messages,
    rating: null,
    createdAt: new Date().toISOString(),
    version: 1,
  };

  await appendExample(examplesPath, example);
  allExamples.push(example);
  console.log(text.success(`Added example #${nextId}`));
}
