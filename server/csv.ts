import { parse } from 'csv-parse/sync';
import { readFile } from 'node:fs/promises';
import { RawProduct } from './types.js';

export async function parseProducts(path: string): Promise<RawProduct[]> {
  const csv = await readFile(path, 'utf8');
  return parse(csv, { columns: true, skip_empty_lines: true, relax_column_count: true }) as RawProduct[];
}