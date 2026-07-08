import { basename, dirname, extname, join } from 'path';

export function noBackgroundOutputPath(inputPath: string): string {
  const dir = dirname(inputPath);
  const base = basename(inputPath, extname(inputPath));
  return join(dir, `${base}_nobg.png`);
}
