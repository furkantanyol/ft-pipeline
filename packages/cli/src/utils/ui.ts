import chalk from 'chalk';
import boxen from 'boxen';
import gradient from 'gradient-string';
import Table from 'cli-table3';

// Brand colors
export const colors = {
  primary: chalk.hex('#6366f1'), // indigo
  success: chalk.hex('#10b981'), // green
  warning: chalk.hex('#f59e0b'), // amber
  error: chalk.hex('#ef4444'), // red
  info: chalk.hex('#3b82f6'), // blue
  muted: chalk.hex('#6b7280'), // gray
  dim: chalk.gray,
  highlight: chalk.bold.hex('#8b5cf6'), // purple
};

// Typography
export const text = {
  heading: (str: string) => gradient.pastel.multiline(chalk.bold(str)),
  subheading: (str: string) => colors.primary.bold(str),
  success: (str: string) => `${colors.success('✓')} ${str}`,
  error: (str: string) => `${colors.error('✗')} ${str}`,
  warning: (str: string) => `${colors.warning('⚠')} ${str}`,
  info: (str: string) => `${colors.info('ℹ')} ${str}`,
  command: (str: string) => colors.dim(`$ ${str}`),
  highlight: (str: string) => colors.highlight(str),
  muted: (str: string) => colors.muted(str),
  number: (num: number | string) => colors.primary.bold(String(num)),
  percentage: (num: number) => colors.success.bold(`${num}%`),
};

// UI Components
export function box(content: string, title?: string) {
  return boxen(content, {
    padding: 1,
    margin: { top: 1, bottom: 1 },
    borderStyle: 'round',
    borderColor: '#6366f1',
    title,
    titleAlignment: 'center',
  });
}

export function section(title: string) {
  console.log('\n' + colors.primary.bold('━'.repeat(70)));
  console.log(colors.primary.bold(` ${title}`));
  console.log(colors.primary.bold('━'.repeat(70)));
}

export function divider() {
  console.log(colors.dim('─'.repeat(70)));
}

export function banner(title: string, subtitle?: string) {
  const content =
    gradient.pastel.multiline(chalk.bold.underline(title)) +
    (subtitle ? '\n' + colors.muted(subtitle) : '');
  console.log(box(content));
}

export function createTable(head: string[], options?: { colWidths?: number[] }) {
  return new Table({
    head: head.map((h) => colors.primary.bold(h)),
    style: {
      head: [],
      border: ['dim'],
    },
    chars: {
      top: '─',
      'top-mid': '┬',
      'top-left': '┌',
      'top-right': '┐',
      bottom: '─',
      'bottom-mid': '┴',
      'bottom-left': '└',
      'bottom-right': '┘',
      left: '│',
      'left-mid': '├',
      mid: '─',
      'mid-mid': '┼',
      right: '│',
      'right-mid': '┤',
      middle: '│',
    },
    ...options,
  });
}

export function progressBar(value: number, total: number, width: number = 40): string {
  const percentage = Math.round((value / total) * 100);
  const filled = Math.round((value / total) * width);
  const empty = width - filled;

  const bar = colors.success('█'.repeat(filled)) + colors.dim('░'.repeat(empty));
  return `${bar} ${colors.primary.bold(percentage + '%')}`;
}

export function ratingBar(rating: number, maxRating: number = 10): string {
  const filled = '★'.repeat(rating);
  const empty = '☆'.repeat(maxRating - rating);
  const color = rating >= 8 ? colors.success : rating >= 5 ? colors.warning : colors.error;
  return color(filled) + colors.dim(empty);
}

export function statusIcon(status: string): string {
  const icons: Record<string, string> = {
    completed: colors.success('✓'),
    running: colors.warning('⟳'),
    pending: colors.info('○'),
    failed: colors.error('✗'),
    success: colors.success('✓'),
    error: colors.error('✗'),
    warning: colors.warning('⚠'),
    info: colors.info('ℹ'),
  };
  return icons[status.toLowerCase()] || icons.info;
}

// Metrics display
export function metric(label: string, value: string | number, suffix: string = '') {
  return `${colors.muted(label + ':')} ${colors.primary.bold(String(value))}${suffix ? colors.muted(' ' + suffix) : ''}`;
}

// List items
export function listItem(text: string, type: 'success' | 'error' | 'info' | 'default' = 'default') {
  const icons = {
    success: colors.success('✓'),
    error: colors.error('✗'),
    info: colors.info('•'),
    default: colors.dim('•'),
  };
  return `  ${icons[type]} ${text}`;
}

// Logo / branding
export function logo() {
  const art = `
   █████╗ ██╗████████╗███████╗██╗     ██╗███████╗██████╗
  ██╔══██╗██║╚══██╔══╝██╔════╝██║     ██║██╔════╝██╔══██╗
  ███████║██║   ██║   █████╗  ██║     ██║█████╗  ██████╔╝
  ██╔══██║██║   ██║   ██╔══╝  ██║     ██║██╔══╝  ██╔══██╗
  ██║  ██║██║   ██║   ███████╗███████╗██║███████╗██║  ██║
  ╚═╝  ╚═╝╚═╝   ╚═╝   ╚══════╝╚══════╝╚═╝╚══════╝╚═╝  ╚═╝
  `;
  return (
    gradient.pastel.multiline(art) +
    '\n' +
    colors.muted('     Your AI atelier - craft fine-tuned models')
  );
}
