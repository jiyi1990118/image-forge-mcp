import { DEFAULTS } from '../config/constants.js';

export function log(...args: unknown[]): void {
  if (DEFAULTS.DEBUG) {
    console.error('[image-forge-mcp]', ...args);
  }
}

export function info(...args: unknown[]): void {
  console.error('[image-forge-mcp]', ...args);
}

export function warn(...args: unknown[]): void {
  console.error('[image-forge-mcp:warn]', ...args);
}

export function error(...args: unknown[]): void {
  console.error('[image-forge-mcp:error]', ...args);
}