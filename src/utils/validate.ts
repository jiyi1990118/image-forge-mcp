export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? clamp(Math.floor(n), min, max) : fallback;
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[/\\]/g, '').replace(/^\.+/, '');
}
