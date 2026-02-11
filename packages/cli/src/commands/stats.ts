import type { Command } from 'commander';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import type { Example } from '../storage/dataset.js';
import { readExamples } from '../storage/dataset.js';
import { loadConfig } from '../storage/config.js';
import {
  section,
  text,
  metric,
  progressBar,
  divider,
  colors,
  statusIcon,
  listItem,
} from '../utils/ui.js';

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
  console.log('');
  section('📊 Dataset Health Overview');
  console.log('');

  // Dataset size with visual bars
  console.log(metric('Total examples', stats.total));
  console.log(
    metric('Rated', `${stats.rated} (${percentage(stats.rated, stats.total)}%)`) +
      '\n  ' +
      progressBar(stats.rated, stats.total),
  );
  console.log(metric('Unrated', `${stats.unrated} (${percentage(stats.unrated, stats.total)}%)`));

  // Rating distribution histogram
  if (stats.rated > 0) {
    console.log('');
    divider();
    console.log(colors.primary.bold('\n Rating Distribution (1-10):\n'));
    displayHistogram(stats.ratingDistribution, stats.rated);
  }

  // Quality threshold analysis
  console.log('');
  divider();
  console.log(colors.primary.bold('\n Quality Analysis:\n'));
  console.log(metric('Threshold', `${threshold}/10`));
  const qualityPct = percentage(stats.aboveThreshold, stats.total);
  const qualityColor =
    qualityPct >= 80 ? colors.success : qualityPct >= 50 ? colors.warning : colors.error;
  console.log(
    metric('High-quality examples', `${stats.aboveThreshold}`) +
      ' ' +
      qualityColor(`(${qualityPct}%)`),
  );

  // Train/val split status
  console.log('');
  divider();
  console.log(colors.primary.bold('\n Train/Val Split:\n'));
  if (stats.trainCount > 0 || stats.valCount > 0) {
    console.log(metric('Training examples', stats.trainCount));
    console.log(metric('Validation examples', stats.valCount));
    console.log('');
    if (stats.hasTrainFile) {
      console.log(listItem('train.jsonl exists', 'success'));
    } else {
      console.log(listItem('train.jsonl not found — run `ait format`', 'error'));
    }
    if (stats.hasValFile) {
      console.log(listItem('val.jsonl exists', 'success'));
    } else {
      console.log(listItem('val.jsonl not found — run `ait format`', 'error'));
    }
  } else {
    console.log(text.muted('  Not yet split'));
    console.log(text.info('  Run `ait split` to create train/val splits'));
  }

  // Readiness assessment
  console.log('');
  divider();
  console.log(colors.primary.bold('\n Readiness Check:\n'));
  assessReadiness(stats, threshold);

  console.log('');
  divider();
  console.log('');
}

function displayHistogram(distribution: Map<number, number>, total: number): void {
  // Display histogram for ratings 1-10
  const maxBarLength = 35;
  const maxCount = Math.max(...Array.from(distribution.values()));

  for (let rating = 10; rating >= 1; rating--) {
    const count = distribution.get(rating) || 0;
    const barLength = maxCount > 0 ? Math.round((count / maxCount) * maxBarLength) : 0;

    // Color based on rating
    const barColor = rating >= 8 ? colors.success : rating >= 5 ? colors.warning : colors.error;
    const bar = barColor('█'.repeat(barLength));
    const pct = percentage(count, total);

    console.log(
      `  ${colors.primary(rating.toString().padStart(2))}${colors.dim('/10')} │ ${bar.padEnd(maxBarLength + 10)} ${colors.muted('│')} ${text.number(count.toString().padStart(3))} ${colors.dim('(' + pct.toString().padStart(2) + '%)')}`,
    );
  }
}

function assessReadiness(stats: DatasetStats, _threshold: number): void {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check for unrated examples
  if (stats.unrated > 0) {
    issues.push(`${stats.unrated} unrated examples`);
    recommendations.push('ait rate — Review and rate all examples');
  }

  // Check for sufficient high-quality examples
  if (stats.aboveThreshold < 20) {
    issues.push(
      `Only ${stats.aboveThreshold} high-quality examples (recommend 20+ for fine-tuning)`,
    );
    if (stats.rated < stats.total) {
      recommendations.push('ait rate — Rate more examples');
    } else {
      recommendations.push('ait add — Add more training examples');
    }
  }

  // Check for train/val split
  if (stats.trainCount === 0 && stats.valCount === 0) {
    issues.push('No train/val split assigned');
    recommendations.push('ait split — Create train/validation splits');
  }

  // Check for formatted files
  if (!stats.hasTrainFile || !stats.hasValFile) {
    issues.push('Training files not generated');
    recommendations.push('ait format — Export to JSONL format');
  }

  if (issues.length === 0) {
    console.log(
      statusIcon('success') + ' ' + colors.success.bold('Dataset is ready for training!\n'),
    );
    console.log(text.highlight('  Next step:'));
    console.log(
      text.muted('  Run ') + text.command('ait train') + text.muted(' to start fine-tuning'),
    );
  } else {
    console.log(statusIcon('warning') + ' ' + colors.warning.bold('Dataset needs attention:\n'));
    for (const issue of issues) {
      console.log(listItem(issue, 'error'));
    }
    console.log('');
    console.log(text.highlight('  Recommended steps:'));
    let step = 1;
    for (const rec of recommendations) {
      console.log(
        colors.muted(`  ${step}.`) +
          ' ' +
          text.command(rec.split(' — ')[0]) +
          colors.muted(' — ' + rec.split(' — ')[1]),
      );
      step++;
    }
  }
}

function percentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}
