import { DEFAULTS } from '../config/constants.js';

export function log(...args: unknown[]): void {
  if (DEFAULTS.DEBUG) {
    console.error('[image-forge-mcp]', ...args);
  }
}

export function warn(...args: unknown[]): void {
  console.error('[image-forge-mcp:warn]', ...args);
}
