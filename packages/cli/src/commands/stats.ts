import type { Command } from 'commander';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import type { Example } from '../storage/dataset.js';
import { readExamples } from '../storage/dataset.js';
import { loadConfig } from '../storage/config.js';

const CONFIG_FILE = '.aitelier.json';
const EXAMPLES_FILE = 'data/examples.jsonl';
const TRAIN_FILE = 'data/train.jsonl';
const VAL_FILE = 'data/val.jsonl';

interface DatasetStats {
  total: number;
  rated: number;
  unrated: number;
  ratingDistribution: Map<number, number>;
  aboveThreshold: number;
  trainCount: number;
  valCount: number;
  hasTrainFile: boolean;
  hasValFile: boolean;
}

export function registerStats(program: Command): void {
  program
    .command('stats')
    .description('Show dataset health overview')
    .action(async () => {
      try {
        await statsCommand();
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}

async function statsCommand(): Promise<void> {
  const cwd = process.cwd();

  // Check if project is initialized
  try {
    await access(join(cwd, CONFIG_FILE));
  } catch {
    throw new Error('Project not initialized. Run `ait init` first to create .aitelier.json');
  }

  // Load config to get quality threshold
  const config = await loadConfig(cwd);

  // Load examples
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

  // Calculate statistics
  const stats = calculateStats(examples, config.qualityThreshold);

  // Check for train/val files
  try {
    await access(join(cwd, TRAIN_FILE));
    stats.hasTrainFile = true;
  } catch {
    stats.hasTrainFile = false;
  }

  try {
    await access(join(cwd, VAL_FILE));
    stats.hasValFile = true;
  } catch {
    stats.hasValFile = false;
  }

  // Count examples with split assignments
  stats.trainCount = examples.filter((e) => e.split === 'train').length;
  stats.valCount = examples.filter((e) => e.split === 'val').length;

  // Display statistics
  displayStats(stats, config.qualityThreshold);
}

function calculateStats(examples: Example[], threshold: number): DatasetStats {
  const stats: DatasetStats = {
    total: examples.length,
    rated: 0,
    unrated: 0,
    ratingDistribution: new Map<number, number>(),
    aboveThreshold: 0,
    trainCount: 0,
    valCount: 0,
    hasTrainFile: false,
    hasValFile: false,
  };

  for (const example of examples) {
    if (example.rating === null) {
      stats.unrated++;
    } else {
      stats.rated++;
      const rating = example.rating;
      stats.ratingDistribution.set(rating, (stats.ratingDistribution.get(rating) || 0) + 1);
      if (rating >= threshold) {
        stats.aboveThreshold++;
      }
    }
  }

  return stats;
}

function displayStats(stats: DatasetStats, threshold: number): void {
  console.log('\n' + '═'.repeat(70));
  console.log('Dataset Health Overview');
  console.log('═'.repeat(70));

  // Dataset size
  console.log(`\nTotal examples: ${stats.total}`);
  console.log(`Rated: ${stats.rated} (${percentage(stats.rated, stats.total)}%)`);
  console.log(`Unrated: ${stats.unrated} (${percentage(stats.unrated, stats.total)}%)`);

  // Rating distribution histogram
  if (stats.rated > 0) {
    console.log('\nRating Distribution:');
    console.log('━'.repeat(70));
    displayHistogram(stats.ratingDistribution, stats.rated);
  }

  // Quality threshold analysis
  console.log('\nQuality Analysis:');
  console.log('━'.repeat(70));
  console.log(`Quality threshold: ${threshold}/10`);
  console.log(
    `Examples ≥ ${threshold}: ${stats.aboveThreshold} (${percentage(stats.aboveThreshold, stats.total)}%)`,
  );

  // Train/val split status
  console.log('\nTrain/Val Split:');
  console.log('━'.repeat(70));
  if (stats.trainCount > 0 || stats.valCount > 0) {
    console.log(`Train: ${stats.trainCount} examples`);
    console.log(`Val: ${stats.valCount} examples`);
    if (stats.hasTrainFile) {
      console.log('✓ train.jsonl exists');
    } else {
      console.log('✗ train.jsonl not found (run `ait format` to generate)');
    }
    if (stats.hasValFile) {
      console.log('✓ val.jsonl exists');
    } else {
      console.log('✗ val.jsonl not found (run `ait format` to generate)');
    }
  } else {
    console.log('Not yet split (run `ait split` to assign train/val splits)');
  }

  // Readiness assessment
  console.log('\nReadiness:');
  console.log('━'.repeat(70));
  assessReadiness(stats, threshold);

  console.log('═'.repeat(70) + '\n');
}

function displayHistogram(distribution: Map<number, number>, total: number): void {
  // Display histogram for ratings 1-10
  const maxBarLength = 40;
  const maxCount = Math.max(...Array.from(distribution.values()));

  for (let rating = 10; rating >= 1; rating--) {
    const count = distribution.get(rating) || 0;
    const barLength = maxCount > 0 ? Math.round((count / maxCount) * maxBarLength) : 0;
    const bar = '█'.repeat(barLength);
    const pct = percentage(count, total);
    console.log(
      `${rating.toString().padStart(2)}/10 │${bar.padEnd(maxBarLength)} │ ${count.toString().padStart(3)} (${pct.toString().padStart(5)}%)`,
    );
  }
}

function assessReadiness(stats: DatasetStats, _threshold: number): void {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check for unrated examples
  if (stats.unrated > 0) {
    issues.push(`${stats.unrated} unrated examples`);
    recommendations.push('Run `ait rate` to rate all examples');
  }

  // Check for sufficient high-quality examples
  if (stats.aboveThreshold < 20) {
    issues.push(
      `Only ${stats.aboveThreshold} examples meet quality threshold (recommend 20+ for fine-tuning)`,
    );
    if (stats.rated < stats.total) {
      recommendations.push('Rate more examples to identify high-quality data');
    } else {
      recommendations.push('Add more examples with `ait add` or lower quality threshold');
    }
  }

  // Check for train/val split
  if (stats.trainCount === 0 && stats.valCount === 0) {
    issues.push('No train/val split assigned');
    recommendations.push('Run `ait split` to create train/val splits');
  }

  // Check for formatted files
  if (!stats.hasTrainFile || !stats.hasValFile) {
    issues.push('Training files not generated');
    recommendations.push('Run `ait format` to generate train.jsonl and val.jsonl');
  }

  if (issues.length === 0) {
    console.log('✓ Dataset is ready for training');
    console.log('  Run `ait train` to start fine-tuning');
  } else {
    console.log('✗ Dataset not ready for training:');
    for (const issue of issues) {
      console.log(`  • ${issue}`);
    }
    console.log('\nRecommended next steps:');
    for (const rec of recommendations) {
      console.log(`  1. ${rec}`);
    }
  }
}

function percentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}
