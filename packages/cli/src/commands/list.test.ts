import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFile, readFile, mkdtemp, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import inquirer from 'inquirer';
import { Command } from 'commander';
import { registerList } from './list.js';
import type { ProjectConfig } from '../storage/config.js';
import type { Example } from '../storage/dataset.js';

function makeExample(overrides: Partial<Example> & { id: number }): Example {
  return {
    messages: [
      { role: 'user', content: `Question ${overrides.id}` },
      { role: 'assistant', content: `Answer ${overrides.id}` },
    ],
    rating: null,
    createdAt: new Date().toISOString(),
    version: 1,
    ...overrides,
  };
}

function writeExamples(path: string, examples: Example[]) {
  return writeFile(path, examples.map((e) => JSON.stringify(e)).join('\n') + '\n');
}

describe('ait list', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ait-list-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);

    const config: ProjectConfig = {
      name: 'test-project',
      provider: 'together',
      model: 'meta-llama/Llama-3.3-70B-Instruct',
      systemPrompt: 'You are a helpful assistant.',
      qualityThreshold: 8,
      runs: [],
    };
    await writeFile('.aitelier.json', JSON.stringify(config, null, 2));
    await mkdir('data', { recursive: true });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('should fail if project is not initialized', async () => {
    await rm('.aitelier.json');

    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const program = new Command();
    registerList(program);

    await expect(program.parseAsync(['node', 'test', 'list', '--no-interactive'])).rejects.toThrow(
      'process.exit called',
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Project not initialized'),
    );
  });

  it('should display message when no examples exist', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerList(program);
    await program.parseAsync(['node', 'test', 'list', '--no-interactive']);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      'No examples found. Add examples with `ait add` first.',
    );
  });

  it('should display message when no examples match filters', async () => {
    const examples = [makeExample({ id: 1, rating: 3 })];
    await writeExamples('data/examples.jsonl', examples);

    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerList(program);
    await program.parseAsync(['node', 'test', 'list', '--no-interactive', '--min', '8']);

    expect(consoleLogSpy).toHaveBeenCalledWith('No examples match the given filters.');
  });

  it('should output JSON with --json flag', async () => {
    const examples = [makeExample({ id: 1, rating: 8 }), makeExample({ id: 2, rating: null })];
    await writeExamples('data/examples.jsonl', examples);

    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerList(program);
    await program.parseAsync(['node', 'test', 'list', '--json']);

    const output = consoleLogSpy.mock.calls[0][0];
    const parsed = JSON.parse(output);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].id).toBe(1);
    expect(parsed[1].id).toBe(2);
  });

  it('should filter --rated examples', async () => {
    const examples = [
      makeExample({ id: 1, rating: 8 }),
      makeExample({ id: 2, rating: null }),
      makeExample({ id: 3, rating: 5 }),
    ];
    await writeExamples('data/examples.jsonl', examples);

    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerList(program);
    await program.parseAsync(['node', 'test', 'list', '--json', '--rated']);

    const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(parsed).toHaveLength(2);
    expect(parsed.every((e: Example) => e.rating !== null)).toBe(true);
  });

  it('should filter --unrated examples', async () => {
    const examples = [
      makeExample({ id: 1, rating: 8 }),
      makeExample({ id: 2, rating: null }),
      makeExample({ id: 3, rating: null }),
    ];
    await writeExamples('data/examples.jsonl', examples);

    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerList(program);
    await program.parseAsync(['node', 'test', 'list', '--json', '--unrated']);

    const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(parsed).toHaveLength(2);
    expect(parsed.every((e: Example) => e.rating === null)).toBe(true);
  });

  it('should filter --min rating', async () => {
    const examples = [
      makeExample({ id: 1, rating: 3 }),
      makeExample({ id: 2, rating: 7 }),
      makeExample({ id: 3, rating: 9 }),
    ];
    await writeExamples('data/examples.jsonl', examples);

    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerList(program);
    await program.parseAsync(['node', 'test', 'list', '--json', '--min', '7']);

    const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].rating).toBe(7);
    expect(parsed[1].rating).toBe(9);
  });

  it('should filter --max rating', async () => {
    const examples = [
      makeExample({ id: 1, rating: 3 }),
      makeExample({ id: 2, rating: 7 }),
      makeExample({ id: 3, rating: 9 }),
    ];
    await writeExamples('data/examples.jsonl', examples);

    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerList(program);
    await program.parseAsync(['node', 'test', 'list', '--json', '--max', '7']);

    const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].rating).toBe(3);
    expect(parsed[1].rating).toBe(7);
  });

  it('should filter --split train', async () => {
    const examples = [
      makeExample({ id: 1, split: 'train' }),
      makeExample({ id: 2, split: 'val' }),
      makeExample({ id: 3 }),
    ];
    await writeExamples('data/examples.jsonl', examples);

    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerList(program);
    await program.parseAsync(['node', 'test', 'list', '--json', '--split', 'train']);

    const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].split).toBe('train');
  });

  it('should filter --split none', async () => {
    const examples = [
      makeExample({ id: 1, split: 'train' }),
      makeExample({ id: 2, split: 'val' }),
      makeExample({ id: 3 }),
    ];
    await writeExamples('data/examples.jsonl', examples);

    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerList(program);
    await program.parseAsync(['node', 'test', 'list', '--json', '--split', 'none']);

    const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].split).toBeUndefined();
  });

  it('should validate --min flag', async () => {
    await writeExamples('data/examples.jsonl', [makeExample({ id: 1 })]);

    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const program = new Command();
    registerList(program);

    await expect(
      program.parseAsync(['node', 'test', 'list', '--no-interactive', '--min', '15']),
    ).rejects.toThrow('process.exit called');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('--min must be a number between 1 and 10'),
    );
  });

  it('should validate --max flag', async () => {
    await writeExamples('data/examples.jsonl', [makeExample({ id: 1 })]);

    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const program = new Command();
    registerList(program);

    await expect(
      program.parseAsync(['node', 'test', 'list', '--no-interactive', '--max', '0']),
    ).rejects.toThrow('process.exit called');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('--max must be a number between 1 and 10'),
    );
  });

  it('should validate --split flag', async () => {
    await writeExamples('data/examples.jsonl', [makeExample({ id: 1 })]);

    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const program = new Command();
    registerList(program);

    await expect(
      program.parseAsync(['node', 'test', 'list', '--no-interactive', '--split', 'invalid']),
    ).rejects.toThrow('process.exit called');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('--split must be one of: train, val, none'),
    );
  });

  it('should render non-interactive table', async () => {
    const examples = [
      makeExample({ id: 1, rating: 8, split: 'train' }),
      makeExample({ id: 2, rating: null }),
    ];
    await writeExamples('data/examples.jsonl', examples);

    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerList(program);
    await program.parseAsync(['node', 'test', 'list', '--no-interactive']);

    // Check that table was rendered (look for ID content)
    const allOutput = consoleLogSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(allOutput).toContain('1');
    expect(allOutput).toContain('2');
  });

  it('should sort examples by ID', async () => {
    const examples = [makeExample({ id: 3 }), makeExample({ id: 1 }), makeExample({ id: 2 })];
    await writeExamples('data/examples.jsonl', examples);

    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerList(program);
    await program.parseAsync(['node', 'test', 'list', '--json']);

    const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(parsed[0].id).toBe(1);
    expect(parsed[1].id).toBe(2);
    expect(parsed[2].id).toBe(3);
  });

  it('should handle interactive view and back', async () => {
    const examples = [makeExample({ id: 1, rating: 7 })];
    await writeExamples('data/examples.jsonl', examples);

    vi.spyOn(inquirer, 'prompt')
      .mockResolvedValueOnce({ action: 'view' })
      .mockResolvedValueOnce({ id: '1' })
      .mockResolvedValueOnce({ action: 'back' })
      .mockResolvedValueOnce({ action: 'quit' });

    const program = new Command();
    registerList(program);
    await program.parseAsync(['node', 'test', 'list']);
  });

  it('should re-rate an example from detail view', async () => {
    const examples = [makeExample({ id: 1, rating: 5 })];
    await writeExamples('data/examples.jsonl', examples);

    vi.spyOn(inquirer, 'prompt')
      .mockResolvedValueOnce({ action: 'view' })
      .mockResolvedValueOnce({ id: '1' })
      .mockResolvedValueOnce({ action: 'rate' })
      .mockResolvedValueOnce({ rating: '9' })
      .mockResolvedValueOnce({ action: 'back' })
      .mockResolvedValueOnce({ action: 'quit' });

    const program = new Command();
    registerList(program);
    await program.parseAsync(['node', 'test', 'list']);

    const content = await readFile('data/examples.jsonl', 'utf-8');
    const updated = JSON.parse(content.trim());
    expect(updated.rating).toBe(9);
  });

  it('should delete an example with confirmation', async () => {
    const examples = [makeExample({ id: 1, rating: 5 }), makeExample({ id: 2, rating: 8 })];
    await writeExamples('data/examples.jsonl', examples);

    vi.spyOn(inquirer, 'prompt')
      .mockResolvedValueOnce({ action: 'view' })
      .mockResolvedValueOnce({ id: '1' })
      .mockResolvedValueOnce({ action: 'delete' })
      .mockResolvedValueOnce({ confirm: true })
      .mockResolvedValueOnce({ action: 'quit' });

    const program = new Command();
    registerList(program);
    await program.parseAsync(['node', 'test', 'list']);

    const content = await readFile('data/examples.jsonl', 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]).id).toBe(2);
  });

  it('should not delete when confirmation is declined', async () => {
    const examples = [makeExample({ id: 1 })];
    await writeExamples('data/examples.jsonl', examples);

    vi.spyOn(inquirer, 'prompt')
      .mockResolvedValueOnce({ action: 'view' })
      .mockResolvedValueOnce({ id: '1' })
      .mockResolvedValueOnce({ action: 'delete' })
      .mockResolvedValueOnce({ confirm: false })
      .mockResolvedValueOnce({ action: 'back' })
      .mockResolvedValueOnce({ action: 'quit' });

    const program = new Command();
    registerList(program);
    await program.parseAsync(['node', 'test', 'list']);

    const content = await readFile('data/examples.jsonl', 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(1);
  });

  it('should edit assistant message and bump version', async () => {
    const examples = [makeExample({ id: 1, version: 1 })];
    await writeExamples('data/examples.jsonl', examples);

    vi.spyOn(inquirer, 'prompt')
      .mockResolvedValueOnce({ action: 'view' })
      .mockResolvedValueOnce({ id: '1' })
      .mockResolvedValueOnce({ action: 'edit-assistant' })
      .mockResolvedValueOnce({ content: 'Updated answer' })
      .mockResolvedValueOnce({ action: 'back' })
      .mockResolvedValueOnce({ action: 'quit' });

    const program = new Command();
    registerList(program);
    await program.parseAsync(['node', 'test', 'list']);

    const content = await readFile('data/examples.jsonl', 'utf-8');
    const updated = JSON.parse(content.trim());
    expect(updated.messages[1].content).toBe('Updated answer');
    expect(updated.version).toBe(2);
  });

  it('should combine multiple filters', async () => {
    const examples = [
      makeExample({ id: 1, rating: 3, split: 'train' }),
      makeExample({ id: 2, rating: 8, split: 'train' }),
      makeExample({ id: 3, rating: 9, split: 'val' }),
      makeExample({ id: 4, rating: null }),
    ];
    await writeExamples('data/examples.jsonl', examples);

    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerList(program);
    await program.parseAsync(['node', 'test', 'list', '--json', '--min', '5', '--split', 'train']);

    const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe(2);
  });
});
