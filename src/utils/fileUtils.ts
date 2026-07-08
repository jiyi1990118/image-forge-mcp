import fs from 'fs';
import path from 'path';

export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function generateFileName(prompt: string, customName?: string, format: string = 'png'): string {
  if (customName) {
    const ext = format.toLowerCase();
    return customName.endsWith(`.${ext}`) ? customName : `${customName}.${ext}`;
  }
  const safePrompt = prompt.slice(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${safePrompt}_${timestamp}_${randomSuffix}.${format}`;
}

export function uniqueFilePath(dir: string, fileName: string): string {
  ensureDir(dir);
  let filePath = path.join(dir, fileName);
  if (!fs.existsSync(filePath)) return filePath;
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  let counter = 1;
  while (fs.existsSync(filePath)) {
    filePath = path.join(dir, `${base}_${counter}${ext}`);
    counter++;
  }
  return filePath;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 1000000);
}
