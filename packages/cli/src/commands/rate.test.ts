import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFile, readFile, mkdtemp, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import inquirer from 'inquirer';
import { Command } from 'commander';
import { registerRate } from './rate.js';
import type { ProjectConfig } from '../storage/config.js';
import type { Example } from '../storage/dataset.js';

describe('ft rate', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Create a temporary directory for each test
    testDir = await mkdtemp(join(tmpdir(), 'ft-rate-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);

    // Create basic project structure
    const config: ProjectConfig = {
      name: 'test-project',
      provider: 'together',
      model: 'meta-llama/Llama-3.3-70B-Instruct',
      qualityThreshold: 8,
      runs: [],
    };
    await writeFile('.ftpipeline.json', JSON.stringify(config, null, 2));
    await mkdir('data', { recursive: true });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('should rate an unrated example', async () => {
    // Create an unrated example
    const example: Example = {
      id: 1,
      messages: [
        { role: 'user', content: 'What is 2 + 2?' },
        { role: 'assistant', content: '2 + 2 equals 4.' },
      ],
      rating: null,
      createdAt: new Date().toISOString(),
      version: 1,
    };
    await writeFile('data/examples.jsonl', JSON.stringify(example) + '\n');

    // Mock inquirer to rate the example then quit
    vi.spyOn(inquirer, 'prompt')
      .mockResolvedValueOnce({ action: 'rate' })
      .mockResolvedValueOnce({ rating: '8' });

    const program = new Command();
    registerRate(program);
    await program.parseAsync(['node', 'test', 'rate']);

    // Verify the rating was saved
    const content = await readFile('data/examples.jsonl', 'utf-8');
    const updated = JSON.parse(content.trim());
    expect(updated.rating).toBe(8);
  });

  it('should rewrite and rate an example', async () => {
    const example: Example = {
      id: 1,
      messages: [
        { role: 'user', content: 'What is AI?' },
        { role: 'assistant', content: 'AI is computers.' },
      ],
      rating: null,
      createdAt: new Date().toISOString(),
      version: 1,
    };
    await writeFile('data/examples.jsonl', JSON.stringify(example) + '\n');

    // Mock inquirer: rewrite → provide new output → rate
    vi.spyOn(inquirer, 'prompt')
      .mockResolvedValueOnce({ action: 'rewrite' })
      .mockResolvedValueOnce({
        output: 'AI is artificial intelligence, a field of computer science.',
      })
      .mockResolvedValueOnce({ rating: '9' });

    const program = new Command();
    registerRate(program);
    await program.parseAsync(['node', 'test', 'rate']);

    // Verify the rewrite and rating
    const content = await readFile('data/examples.jsonl', 'utf-8');
    const updated = JSON.parse(content.trim());
    expect(updated.rating).toBe(9);
    expect(updated.messages[1].content).toBe(
      'AI is artificial intelligence, a field of computer science.',
    );
    expect(updated.originalOutput).toBe('AI is computers.');
  });

  it('should preserve originalOutput on subsequent rewrites', async () => {
    const example: Example = {
      id: 1,
      messages: [
        { role: 'user', content: 'What is AI?' },
        { role: 'assistant', content: 'AI is computers.' },
      ],
      rating: null,
      originalOutput: 'Original answer.',
      createdAt: new Date().toISOString(),
      version: 1,
    };
    await writeFile('data/examples.jsonl', JSON.stringify(example) + '\n');

    // Mock inquirer: rewrite again
    vi.spyOn(inquirer, 'prompt')
      .mockResolvedValueOnce({ action: 'rewrite' })
      .mockResolvedValueOnce({ output: 'Third version of the answer.' })
      .mockResolvedValueOnce({ rating: '7' });

    const program = new Command();
    registerRate(program);
    await program.parseAsync(['node', 'test', 'rate']);

    // Verify originalOutput is unchanged
    const content = await readFile('data/examples.jsonl', 'utf-8');
    const updated = JSON.parse(content.trim());
    expect(updated.originalOutput).toBe('Original answer.');
    expect(updated.messages[1].content).toBe('Third version of the answer.');
  });

  it('should skip an example without changes', async () => {
    const example: Example = {
      id: 1,
      messages: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ],
      rating: null,
      createdAt: new Date().toISOString(),
      version: 1,
    };
    await writeFile('data/examples.jsonl', JSON.stringify(example) + '\n');

    // Mock inquirer: skip
    vi.spyOn(inquirer, 'prompt').mockResolvedValueOnce({ action: 'skip' });

    const program = new Command();
    registerRate(program);
    await program.parseAsync(['node', 'test', 'rate']);

    // Verify no changes
    const content = await readFile('data/examples.jsonl', 'utf-8');
    const updated = JSON.parse(content.trim());
    expect(updated.rating).toBeNull();
    expect(updated.messages[1].content).toBe('Hi there!');
  });

  it('should quit early and save progress', async () => {
    const examples: Example[] = [
      {
        id: 1,
        messages: [
          { role: 'user', content: 'Question 1' },
          { role: 'assistant', content: 'Answer 1' },
        ],
        rating: null,
        createdAt: new Date().toISOString(),
        version: 1,
      },
      {
        id: 2,
        messages: [
          { role: 'user', content: 'Question 2' },
          { role: 'assistant', content: 'Answer 2' },
        ],
        rating: null,
        createdAt: new Date().toISOString(),
        version: 1,
      },
    ];
    await writeFile(
      'data/examples.jsonl',
      examples.map((e) => JSON.stringify(e)).join('\n') + '\n',
    );

    // Mock inquirer: rate first, then quit before second
    vi.spyOn(inquirer, 'prompt')
      .mockResolvedValueOnce({ action: 'rate' })
      .mockResolvedValueOnce({ rating: '7' })
      .mockResolvedValueOnce({ action: 'quit' });

    const program = new Command();
    registerRate(program);
    await program.parseAsync(['node', 'test', 'rate']);

    // Verify first was rated, second was not
    const content = await readFile('data/examples.jsonl', 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(2);

    const updated1 = JSON.parse(lines[0]);
    const updated2 = JSON.parse(lines[1]);
    expect(updated1.rating).toBe(7);
    expect(updated2.rating).toBeNull();
  });

  it('should filter by --min flag', async () => {
    const examples: Example[] = [
      {
        id: 1,
        messages: [
          { role: 'user', content: 'Q1' },
          { role: 'assistant', content: 'A1' },
        ],
        rating: 5,
        createdAt: new Date().toISOString(),
        version: 1,
      },
      {
        id: 2,
        messages: [
          { role: 'user', content: 'Q2' },
          { role: 'assistant', content: 'A2' },
        ],
        rating: 9,
        createdAt: new Date().toISOString(),
        version: 1,
      },
      {
        id: 3,
        messages: [
          { role: 'user', content: 'Q3' },
          { role: 'assistant', content: 'A3' },
        ],
        rating: null,
        createdAt: new Date().toISOString(),
        version: 1,
      },
    ];
    await writeFile(
      'data/examples.jsonl',
      examples.map((e) => JSON.stringify(e)).join('\n') + '\n',
    );

    // Mock inquirer: rate the first low-rated example then quit
    vi.spyOn(inquirer, 'prompt')
      .mockResolvedValueOnce({ action: 'rate' })
      .mockResolvedValueOnce({ rating: '8' })
      .mockResolvedValueOnce({ action: 'quit' });

    const program = new Command();
    registerRate(program);
    await program.parseAsync(['node', 'test', 'rate', '--min', '8']);

    // Verify only examples with rating < 8 or null were shown
    // ID 1 (rating 5) and ID 3 (null) should be shown
    // ID 2 (rating 9) should not be shown
    const content = await readFile('data/examples.jsonl', 'utf-8');
    const lines = content.trim().split('\n');
    const updated = lines.map((line) => JSON.parse(line));

    // First example should be updated
    expect(updated[0].rating).toBe(8);
    // Second example should be unchanged
    expect(updated[1].rating).toBe(9);
    // Third example should be unchanged (quit before reaching it)
    expect(updated[2].rating).toBeNull();
  });

  it('should display message when no examples to rate', async () => {
    const example: Example = {
      id: 1,
      messages: [
        { role: 'user', content: 'Test' },
        { role: 'assistant', content: 'Response' },
      ],
      rating: 9,
      createdAt: new Date().toISOString(),
      version: 1,
    };
    await writeFile('data/examples.jsonl', JSON.stringify(example) + '\n');

    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerRate(program);
    await program.parseAsync(['node', 'test', 'rate']);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      'No unrated examples found. All examples have been rated.',
    );
  });

  it('should display message when no examples exist', async () => {
    await writeFile('data/examples.jsonl', '');

    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerRate(program);
    await program.parseAsync(['node', 'test', 'rate']);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      'No examples found. Add examples with `ft add` first.',
    );
  });

  it('should fail if project is not initialized', async () => {
    await rm('.ftpipeline.json');

    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const program = new Command();
    registerRate(program);

    await expect(program.parseAsync(['node', 'test', 'rate'])).rejects.toThrow(
      'process.exit called',
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Project not initialized'),
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should validate --min flag', async () => {
    await writeFile('data/examples.jsonl', '');

    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const program = new Command();
    registerRate(program);

    await expect(program.parseAsync(['node', 'test', 'rate', '--min', '15'])).rejects.toThrow(
      'process.exit called',
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('--min must be a number between 0 and 10'),
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should display session summary with statistics', async () => {
    const examples: Example[] = [
      {
        id: 1,
        messages: [
          { role: 'user', content: 'Q1' },
          { role: 'assistant', content: 'A1' },
        ],
        rating: null,
        createdAt: new Date().toISOString(),
        version: 1,
      },
      {
        id: 2,
        messages: [
          { role: 'user', content: 'Q2' },
          { role: 'assistant', content: 'A2' },
        ],
        rating: null,
        createdAt: new Date().toISOString(),
        version: 1,
      },
    ];
    await writeFile(
      'data/examples.jsonl',
      examples.map((e) => JSON.stringify(e)).join('\n') + '\n',
    );

    const consoleLogSpy = vi.spyOn(console, 'log');

    // Mock inquirer: rate both examples
    vi.spyOn(inquirer, 'prompt')
      .mockResolvedValueOnce({ action: 'rate' })
      .mockResolvedValueOnce({ rating: '8' })
      .mockResolvedValueOnce({ action: 'rate' })
      .mockResolvedValueOnce({ rating: '9' });

    const program = new Command();
    registerRate(program);
    await program.parseAsync(['node', 'test', 'rate']);

    // Verify summary was displayed
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Rating Session Complete'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Examples shown: 2'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Rated: 2'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Average rating: 8.5/10'));
  });

  it('should handle examples with system prompt', async () => {
    const example: Example = {
      id: 1,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' },
      ],
      rating: null,
      createdAt: new Date().toISOString(),
      version: 1,
    };
    await writeFile('data/examples.jsonl', JSON.stringify(example) + '\n');

    // Mock inquirer to rate
    vi.spyOn(inquirer, 'prompt')
      .mockResolvedValueOnce({ action: 'rate' })
      .mockResolvedValueOnce({ rating: '7' });

    const program = new Command();
    registerRate(program);
    await program.parseAsync(['node', 'test', 'rate']);

    // Verify the rating was saved and all messages preserved
    const content = await readFile('data/examples.jsonl', 'utf-8');
    const updated = JSON.parse(content.trim());
    expect(updated.rating).toBe(7);
    expect(updated.messages).toHaveLength(3);
    expect(updated.messages[0].role).toBe('system');
  });

  it('should sort examples by ID when filtering', async () => {
    const examples: Example[] = [
      {
        id: 3,
        messages: [
          { role: 'user', content: 'Q3' },
          { role: 'assistant', content: 'A3' },
        ],
        rating: null,
        createdAt: new Date().toISOString(),
        version: 1,
      },
      {
        id: 1,
        messages: [
          { role: 'user', content: 'Q1' },
          { role: 'assistant', content: 'A1' },
        ],
        rating: null,
        createdAt: new Date().toISOString(),
        version: 1,
      },
      {
        id: 2,
        messages: [
          { role: 'user', content: 'Q2' },
          { role: 'assistant', content: 'A2' },
        ],
        rating: null,
        createdAt: new Date().toISOString(),
        version: 1,
      },
    ];
    await writeFile(
      'data/examples.jsonl',
      examples.map((e) => JSON.stringify(e)).join('\n') + '\n',
    );

    const consoleLogSpy = vi.spyOn(console, 'log');

    // Mock inquirer: just check the first example shown
    vi.spyOn(inquirer, 'prompt').mockResolvedValueOnce({ action: 'quit' });

    const program = new Command();
    registerRate(program);
    await program.parseAsync(['node', 'test', 'rate']);

    // Verify Example #1 was shown first (sorted by ID)
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Example #1'));
  });
});
