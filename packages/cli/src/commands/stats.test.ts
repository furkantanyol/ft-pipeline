import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFile, mkdtemp, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Command } from 'commander';
import { registerStats } from './stats.js';
import type { ProjectConfig } from '../storage/config.js';
import type { Example } from '../storage/dataset.js';

describe('ft stats', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Create a temporary directory for each test
    testDir = await mkdtemp(join(tmpdir(), 'ft-stats-test-'));
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

  it('should display stats for a dataset with rated and unrated examples', async () => {
    const examples: Example[] = [
      {
        id: 1,
        messages: [
          { role: 'user', content: 'Q1' },
          { role: 'assistant', content: 'A1' },
        ],
        rating: 8,
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

    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerStats(program);
    await program.parseAsync(['node', 'test', 'stats']);

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Dataset Health Overview'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Total examples: 3'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Rated: 2 (67%)'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Unrated: 1 (33%)'));
  });

  it('should display rating distribution histogram', async () => {
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
        rating: 8,
        createdAt: new Date().toISOString(),
        version: 1,
      },
      {
        id: 3,
        messages: [
          { role: 'user', content: 'Q3' },
          { role: 'assistant', content: 'A3' },
        ],
        rating: 8,
        createdAt: new Date().toISOString(),
        version: 1,
      },
      {
        id: 4,
        messages: [
          { role: 'user', content: 'Q4' },
          { role: 'assistant', content: 'A4' },
        ],
        rating: 10,
        createdAt: new Date().toISOString(),
        version: 1,
      },
    ];
    await writeFile(
      'data/examples.jsonl',
      examples.map((e) => JSON.stringify(e)).join('\n') + '\n',
    );

    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerStats(program);
    await program.parseAsync(['node', 'test', 'stats']);

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Rating Distribution:'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('10/10'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(' 8/10'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(' 5/10'));
  });

  it('should show quality threshold analysis', async () => {
    const examples: Example[] = [
      {
        id: 1,
        messages: [
          { role: 'user', content: 'Q1' },
          { role: 'assistant', content: 'A1' },
        ],
        rating: 7,
        createdAt: new Date().toISOString(),
        version: 1,
      },
      {
        id: 2,
        messages: [
          { role: 'user', content: 'Q2' },
          { role: 'assistant', content: 'A2' },
        ],
        rating: 8,
        createdAt: new Date().toISOString(),
        version: 1,
      },
      {
        id: 3,
        messages: [
          { role: 'user', content: 'Q3' },
          { role: 'assistant', content: 'A3' },
        ],
        rating: 9,
        createdAt: new Date().toISOString(),
        version: 1,
      },
    ];
    await writeFile(
      'data/examples.jsonl',
      examples.map((e) => JSON.stringify(e)).join('\n') + '\n',
    );

    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerStats(program);
    await program.parseAsync(['node', 'test', 'stats']);

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Quality Analysis:'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Quality threshold: 8/10'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Examples ≥ 8: 2 (67%)'));
  });

  it('should show train/val split status when not split', async () => {
    const examples: Example[] = [
      {
        id: 1,
        messages: [
          { role: 'user', content: 'Q1' },
          { role: 'assistant', content: 'A1' },
        ],
        rating: 8,
        createdAt: new Date().toISOString(),
        version: 1,
      },
    ];
    await writeFile('data/examples.jsonl', JSON.stringify(examples[0]) + '\n');

    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerStats(program);
    await program.parseAsync(['node', 'test', 'stats']);

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Train/Val Split:'));
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Not yet split (run `ft split` to assign train/val splits)'),
    );
  });

  it('should show train/val split status when split is assigned', async () => {
    const examples: Example[] = [
      {
        id: 1,
        messages: [
          { role: 'user', content: 'Q1' },
          { role: 'assistant', content: 'A1' },
        ],
        rating: 8,
        createdAt: new Date().toISOString(),
        version: 1,
        split: 'train',
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
        split: 'val',
      },
    ];
    await writeFile(
      'data/examples.jsonl',
      examples.map((e) => JSON.stringify(e)).join('\n') + '\n',
    );

    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerStats(program);
    await program.parseAsync(['node', 'test', 'stats']);

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Train: 1 examples'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Val: 1 examples'));
  });

  it('should detect when train.jsonl and val.jsonl files exist', async () => {
    const examples: Example[] = [
      {
        id: 1,
        messages: [
          { role: 'user', content: 'Q1' },
          { role: 'assistant', content: 'A1' },
        ],
        rating: 8,
        createdAt: new Date().toISOString(),
        version: 1,
        split: 'train',
      },
    ];
    await writeFile('data/examples.jsonl', JSON.stringify(examples[0]) + '\n');
    await writeFile('data/train.jsonl', JSON.stringify(examples[0]) + '\n');
    await writeFile('data/val.jsonl', JSON.stringify(examples[0]) + '\n');

    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerStats(program);
    await program.parseAsync(['node', 'test', 'stats']);

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✓ train.jsonl exists'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✓ val.jsonl exists'));
  });

  it('should show missing train/val files when split is assigned but files not generated', async () => {
    const examples: Example[] = [
      {
        id: 1,
        messages: [
          { role: 'user', content: 'Q1' },
          { role: 'assistant', content: 'A1' },
        ],
        rating: 8,
        createdAt: new Date().toISOString(),
        version: 1,
        split: 'train',
      },
    ];
    await writeFile('data/examples.jsonl', JSON.stringify(examples[0]) + '\n');

    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerStats(program);
    await program.parseAsync(['node', 'test', 'stats']);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('✗ train.jsonl not found (run `ft format` to generate)'),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('✗ val.jsonl not found (run `ft format` to generate)'),
    );
  });

  it('should assess readiness and show dataset is ready', async () => {
    // Create 20+ high-quality examples with split and files
    const examples: Example[] = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      messages: [
        { role: 'user', content: `Q${i + 1}` },
        { role: 'assistant', content: `A${i + 1}` },
      ],
      rating: 8,
      createdAt: new Date().toISOString(),
      version: 1,
      split: i % 5 === 0 ? ('val' as const) : ('train' as const),
    }));
    await writeFile(
      'data/examples.jsonl',
      examples.map((e) => JSON.stringify(e)).join('\n') + '\n',
    );
    await writeFile('data/train.jsonl', '');
    await writeFile('data/val.jsonl', '');

    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerStats(program);
    await program.parseAsync(['node', 'test', 'stats']);

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Readiness:'));
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('✓ Dataset is ready for training'),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Run `ft train` to start fine-tuning'),
    );
  });

  it('should assess readiness and show issues when dataset not ready', async () => {
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
        rating: 5,
        createdAt: new Date().toISOString(),
        version: 1,
      },
    ];
    await writeFile(
      'data/examples.jsonl',
      examples.map((e) => JSON.stringify(e)).join('\n') + '\n',
    );

    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerStats(program);
    await program.parseAsync(['node', 'test', 'stats']);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('✗ Dataset not ready for training:'),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('unrated examples'));
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('meet quality threshold (recommend 20+ for fine-tuning)'),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('No train/val split assigned'),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Training files not generated'),
    );
  });

  it('should display message when no examples exist', async () => {
    await writeFile('data/examples.jsonl', '');

    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerStats(program);
    await program.parseAsync(['node', 'test', 'stats']);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      'No examples found. Add examples with `ft add` first.',
    );
  });

  it('should display message when examples file does not exist', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerStats(program);
    await program.parseAsync(['node', 'test', 'stats']);

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
    registerStats(program);

    await expect(program.parseAsync(['node', 'test', 'stats'])).rejects.toThrow(
      'process.exit called',
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Project not initialized'),
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should handle dataset with all examples rated', async () => {
    const examples: Example[] = [
      {
        id: 1,
        messages: [
          { role: 'user', content: 'Q1' },
          { role: 'assistant', content: 'A1' },
        ],
        rating: 8,
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
    ];
    await writeFile(
      'data/examples.jsonl',
      examples.map((e) => JSON.stringify(e)).join('\n') + '\n',
    );

    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerStats(program);
    await program.parseAsync(['node', 'test', 'stats']);

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Rated: 2 (100%)'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Unrated: 0 (0%)'));
  });

  it('should handle dataset with all examples unrated', async () => {
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

    const program = new Command();
    registerStats(program);
    await program.parseAsync(['node', 'test', 'stats']);

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Rated: 0 (0%)'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Unrated: 2 (100%)'));
    // Should not display rating distribution when no ratings
    const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n');
    expect(allCalls).not.toContain('Rating Distribution:');
  });

  it('should calculate percentages correctly', async () => {
    const examples: Example[] = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      messages: [
        { role: 'user', content: `Q${i + 1}` },
        { role: 'assistant', content: `A${i + 1}` },
      ],
      rating: i < 7 ? 8 : null,
      createdAt: new Date().toISOString(),
      version: 1,
    }));
    await writeFile(
      'data/examples.jsonl',
      examples.map((e) => JSON.stringify(e)).join('\n') + '\n',
    );

    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerStats(program);
    await program.parseAsync(['node', 'test', 'stats']);

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Rated: 7 (70%)'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Unrated: 3 (30%)'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Examples ≥ 8: 7 (70%)'));
  });

  it('should display recommendation to rate more examples when insufficient quality', async () => {
    const examples: Example[] = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      messages: [
        { role: 'user', content: `Q${i + 1}` },
        { role: 'assistant', content: `A${i + 1}` },
      ],
      rating: null,
      createdAt: new Date().toISOString(),
      version: 1,
    }));
    await writeFile(
      'data/examples.jsonl',
      examples.map((e) => JSON.stringify(e)).join('\n') + '\n',
    );

    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerStats(program);
    await program.parseAsync(['node', 'test', 'stats']);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Rate more examples to identify high-quality data'),
    );
  });

  it('should display recommendation to add more examples when all rated but insufficient quality', async () => {
    const examples: Example[] = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      messages: [
        { role: 'user', content: `Q${i + 1}` },
        { role: 'assistant', content: `A${i + 1}` },
      ],
      rating: 5,
      createdAt: new Date().toISOString(),
      version: 1,
    }));
    await writeFile(
      'data/examples.jsonl',
      examples.map((e) => JSON.stringify(e)).join('\n') + '\n',
    );

    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerStats(program);
    await program.parseAsync(['node', 'test', 'stats']);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Add more examples with `ft add` or lower quality threshold'),
    );
  });
});
