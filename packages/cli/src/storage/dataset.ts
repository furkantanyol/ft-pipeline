import { readFile, appendFile } from 'node:fs/promises';
import type { Message } from '../providers/types.js';

export interface Example {
  id: number;
  messages: Message[];
  rating: number | null;
  originalOutput?: string;
  createdAt: string;
  version: number;
  split?: 'train' | 'val';
}

export async function readExamples(filePath: string): Promise<Example[]> {
  const raw = await readFile(filePath, 'utf-8');
  return raw
    .trim()
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as Example);
}

export async function appendExample(filePath: string, example: Example): Promise<void> {
  await appendFile(filePath, JSON.stringify(example) + '\n');
}

export async function writeExamples(filePath: string, examples: Example[]): Promise<void> {
  const { writeFile } = await import('node:fs/promises');
  const content = examples.map((e) => JSON.stringify(e)).join('\n') + '\n';
  await writeFile(filePath, content);
}
