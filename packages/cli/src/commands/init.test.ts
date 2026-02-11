import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFile, access, readFile, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import inquirer from 'inquirer';
import { Command } from 'commander';
import { registerInit } from './init.js';

describe('ft init', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Create a temporary directory for each test
    testDir = await mkdtemp(join(tmpdir(), 'ft-init-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('should initialize a new project with valid inputs', async () => {
    // Mock inquirer prompts
    vi.spyOn(inquirer, 'prompt').mockResolvedValue({
      name: 'my-support-bot',
      provider: 'together',
      model: 'meta-llama/Llama-3.3-70B-Instruct',
      systemPrompt: 'You are a helpful assistant.',
    });

    const program = new Command();
    registerInit(program);

    await program.parseAsync(['node', 'test', 'init']);

    // Verify config file was created
    const configPath = join(testDir, '.ftpipeline.json');
    const configContent = await readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    expect(config).toEqual({
      name: 'my-support-bot',
      provider: 'together',
      model: 'meta-llama/Llama-3.3-70B-Instruct',
      systemPrompt: 'You are a helpful assistant.',
      qualityThreshold: 8,
      runs: [],
    });

    // Verify data directory structure
    const dataDir = join(testDir, 'data');
    await access(dataDir);
    await access(join(dataDir, 'examples.jsonl'));
    await access(join(dataDir, 'train.jsonl'));
    await access(join(dataDir, 'val.jsonl'));
    await access(join(dataDir, 'evals'));
  });

  it('should initialize with OpenAI provider and default model', async () => {
    vi.spyOn(inquirer, 'prompt').mockResolvedValue({
      name: 'openai-project',
      provider: 'openai',
      model: 'gpt-4o-mini-2024-07-18',
      systemPrompt: '',
    });

    const program = new Command();
    registerInit(program);

    await program.parseAsync(['node', 'test', 'init']);

    const configPath = join(testDir, '.ftpipeline.json');
    const configContent = await readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    expect(config.provider).toBe('openai');
    expect(config.model).toBe('gpt-4o-mini-2024-07-18');
    expect(config.systemPrompt).toBeUndefined();
  });

  it('should fail if project is already initialized', async () => {
    // Create an existing config file
    await writeFile(join(testDir, '.ftpipeline.json'), '{}');

    vi.spyOn(inquirer, 'prompt').mockResolvedValue({
      name: 'test-project',
      provider: 'together',
      model: 'meta-llama/Llama-3.3-70B-Instruct',
      systemPrompt: '',
    });

    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const program = new Command();
    registerInit(program);

    await expect(program.parseAsync(['node', 'test', 'init'])).rejects.toThrow(
      'process.exit called',
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Project already initialized'),
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should trim whitespace from project name', async () => {
    vi.spyOn(inquirer, 'prompt').mockResolvedValue({
      name: '  spaced-project  ',
      provider: 'together',
      model: 'meta-llama/Llama-3.3-70B-Instruct',
      systemPrompt: '',
    });

    const program = new Command();
    registerInit(program);

    await program.parseAsync(['node', 'test', 'init']);

    const configPath = join(testDir, '.ftpipeline.json');
    const configContent = await readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    expect(config.name).toBe('spaced-project');
  });

  it('should create empty JSONL files in data directory', async () => {
    vi.spyOn(inquirer, 'prompt').mockResolvedValue({
      name: 'test-project',
      provider: 'together',
      model: 'meta-llama/Llama-3.3-70B-Instruct',
      systemPrompt: '',
    });

    const program = new Command();
    registerInit(program);

    await program.parseAsync(['node', 'test', 'init']);

    // Verify JSONL files are empty
    const examplesContent = await readFile(join(testDir, 'data', 'examples.jsonl'), 'utf-8');
    const trainContent = await readFile(join(testDir, 'data', 'train.jsonl'), 'utf-8');
    const valContent = await readFile(join(testDir, 'data', 'val.jsonl'), 'utf-8');

    expect(examplesContent).toBe('');
    expect(trainContent).toBe('');
    expect(valContent).toBe('');
  });
});
