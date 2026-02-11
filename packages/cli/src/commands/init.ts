import type { Command } from 'commander';
import inquirer from 'inquirer';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import type { ProjectConfig } from '../storage/config.js';
import { saveConfig } from '../storage/config.js';

const CONFIG_FILE = '.aitelier.json';

const DEFAULT_MODELS = {
  together: 'meta-llama/Llama-3.3-70B-Instruct',
  openai: 'gpt-4o-mini-2024-07-18',
};

export function registerInit(program: Command): void {
  program
    .command('init')
    .description('Initialize a new fine-tuning project')
    .action(async () => {
      try {
        await initCommand();
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}

async function initCommand(): Promise<void> {
  const cwd = process.cwd();

  // Check if project is already initialized
  try {
    await access(join(cwd, CONFIG_FILE));
    throw new Error('Project already initialized. .aitelier.json already exists.');
  } catch (error) {
    // File doesn't exist, continue with init
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  // Interactive prompts
  const answers = await inquirer.prompt<{
    name: string;
    provider: 'together' | 'openai';
    model: string;
    systemPrompt: string;
  }>([
    {
      type: 'input',
      name: 'name',
      message: 'Project name:',
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Project name is required';
        }
        return true;
      },
    },
    {
      type: 'list',
      name: 'provider',
      message: 'Choose a provider:',
      choices: [
        { name: 'Together.ai', value: 'together' },
        { name: 'OpenAI', value: 'openai' },
      ],
    },
    {
      type: 'input',
      name: 'model',
      message: 'Base model:',
      default: (answers: { provider: 'together' | 'openai' }) => DEFAULT_MODELS[answers.provider],
    },
    {
      type: 'input',
      name: 'systemPrompt',
      message: 'System prompt (optional, press Enter to skip):',
      default: '',
    },
  ]);

  // Create config
  const config: ProjectConfig = {
    name: answers.name.trim(),
    provider: answers.provider,
    model: answers.model,
    systemPrompt: answers.systemPrompt || undefined,
    qualityThreshold: 8,
    runs: [],
  };

  // Save config file
  await saveConfig(config, cwd);
  console.log('✓ Created .aitelier.json');

  // Create data directory structure
  const dataDir = join(cwd, 'data');
  const evalsDir = join(dataDir, 'evals');

  await mkdir(evalsDir, { recursive: true });
  await writeFile(join(dataDir, 'examples.jsonl'), '');
  await writeFile(join(dataDir, 'train.jsonl'), '');
  await writeFile(join(dataDir, 'val.jsonl'), '');

  console.log('✓ Created data/ directory');
  console.log('✓ Ready to add training examples with `ait add`');
}
