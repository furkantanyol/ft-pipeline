import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFile, mkdtemp, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Command } from 'commander';
import { registerStats } from './stats.js';
import type { ProjectConfig } from '../storage/config.js';
import type { Example } from '../storage/dataset.js';

describe('ait stats', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Create a temporary directory for each test
    testDir = await mkdtemp(join(tmpdir(), 'ait-stats-test-'));
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
    await writeFile('.aitelier.json', JSON.stringify(config, null, 2));
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

    // Check rating distribution is displayed
    const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n');
    expect(allCalls).toContain('Rating Distribution');
    expect(allCalls).toContain('10');
    expect(allCalls).toContain(' 8');
    expect(allCalls).toContain(' 5');
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

    // Check quality analysis section
    const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n');
    expect(allCalls).toContain('Quality Analysis');
    expect(allCalls).toContain('Threshold');
    expect(allCalls).toContain('67%');
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

    // Check that split section is shown
    const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n');
    expect(allCalls).toContain('Train/Val Split');
    expect(allCalls).toContain('Not yet split');
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

    // Check that split counts are displayed
    const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n');
    expect(allCalls).toContain('Training examples');
    expect(allCalls).toContain('Validation examples');
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

    // Check that file existence is reported
    const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n');
    expect(allCalls).toContain('train.jsonl exists');
    expect(allCalls).toContain('val.jsonl exists');
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

    // Check that missing files are reported
    const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n');
    expect(allCalls).toContain('train.jsonl not found');
    expect(allCalls).toContain('val.jsonl not found');
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

    // Check readiness assessment
    const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n');
    expect(allCalls).toContain('Readiness');
    expect(allCalls).toContain('ready for training');
    expect(allCalls).toContain('ait train');
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

    // Check that issues are reported
    const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n');
    expect(allCalls).toContain('unrated');
    expect(allCalls).toContain('high-quality');
    expect(allCalls).toContain('split');
    expect(allCalls).toContain('Training files');
  });

  it('should display message when no examples exist', async () => {
    await writeFile('data/examples.jsonl', '');

    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerStats(program);
    await program.parseAsync(['node', 'test', 'stats']);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      'No examples found. Add examples with `ait add` first.',
    );
  });

  it('should display message when examples file does not exist', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log');

    const program = new Command();
    registerStats(program);
    await program.parseAsync(['node', 'test', 'stats']);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      'No examples found. Add examples with `ait add` first.',
    );
  });

  it('should fail if project is not initialized', async () => {
    await rm('.aitelier.json');

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

    // Check that stats are displayed (with new format)
    const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n');
    expect(allCalls).toContain('Total examples');
    expect(allCalls).toContain('Rated');
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

    // Check that stats are displayed with unrated examples
    const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n');
    expect(allCalls).toContain('Total examples');
    expect(allCalls).toContain('Rated');
    expect(allCalls).toContain('Unrated');
    // Should not display rating distribution when no ratings
    expect(allCalls).not.toContain('Rating Distribution');
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

    // Check that percentages are calculated correctly with new format
    const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n');
    expect(allCalls).toContain('70%');
    expect(allCalls).toContain('30%');
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

    // Check recommendation to rate examples
    const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n');
    expect(allCalls).toContain('ait rate');
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

    // Check recommendation to add more examples
    const allCalls = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n');
    expect(allCalls).toContain('ait add');
  });
});
