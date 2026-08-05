import { log } from '../../utils/logger.js';

export interface AuthConfig {
  token?: string;
  referrer?: string;
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 520, 521, 522, 524]);

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带指数退避重试的 fetch
 *
 * 重试条件:
 * - HTTP 429 (Too Many Requests)
 * - HTTP 500/502/503 (Server Error)
 * - HTTP 520/521/522/524 (Cloudflare)
 * - 网络超时 (AbortError)
 *
 * 策略:
 * - 初始等待 2s, 每次翻倍, 最大 30s
 * - 最多重试 3 次
 * - 429 时读取 Retry-After header (如果有)
 */
export async function fetchWithAuth(
  url: string,
  authConfig: AuthConfig | null,
  options: RequestInit = {}
): Promise<Response> {
  const maxRetries = 3;
  const baseDelay = 2000;
  const maxDelay = 30000;
  const timeoutMs = 60000;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const fetchOptions: RequestInit = { ...options };
    if (authConfig) {
      const headers = new Headers(fetchOptions.headers);
      if (authConfig.token) {
        headers.set('Authorization', `Bearer ${authConfig.token}`);
      }
      if (authConfig.referrer) {
        headers.set('Referer', authConfig.referrer);
      }
      fetchOptions.headers = headers;
    }

    if (attempt > 0) {
      log(`Retry attempt ${attempt}/${maxRetries}`);
    } else {
      log('Fetching:', url);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        return response;
      }

      // 检查是否可重试
      if (!RETRYABLE_STATUS.has(response.status) || attempt === maxRetries) {
        const body = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status} ${response.statusText}: ${body.slice(0, 200)}`);
      }

      // 可重试的错误
      const body = await response.text().catch(() => '');
      log(`HTTP ${response.status}, will retry: ${body.slice(0, 100)}`);

      // 429: 尝试读取 Retry-After
      let delay: number;
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        if (retryAfter) {
          delay = Math.min(parseInt(retryAfter, 10) * 1000 || baseDelay, maxDelay);
        } else {
          delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        }
      } else {
        delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      }

      // 加随机抖动 (0-500ms) 避免雷击
      delay += Math.floor(Math.random() * 500);

      log(`Waiting ${Math.round(delay / 1000)}s before retry...`);
      await sleep(delay);
      lastError = new Error(`HTTP ${response.status}: ${body.slice(0, 100)}`);
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof Error && err.name === 'AbortError') {
        log(`Request timed out after ${timeoutMs / 1000}s`);
        if (attempt === maxRetries) {
          throw new Error(`Request timed out after ${timeoutMs / 1000}s (retried ${maxRetries} times)`);
        }
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        log(`Waiting ${Math.round(delay / 1000)}s before retry...`);
        await sleep(delay);
        lastError = err;
      } else if (err instanceof Error) {
        // 网络错误也可重试
        const message = err.message;
        if (message.startsWith('HTTP') && !RETRYABLE_STATUS.has(parseInt(message.match(/HTTP (\d+)/)?.[1] || '0', 10))) {
          throw err;
        }
        if (attempt === maxRetries) {
          throw err;
        }
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        log(`Network error: ${message.slice(0, 100)}, retrying in ${Math.round(delay / 1000)}s...`);
        await sleep(delay);
        lastError = err;
      } else {
        throw err;
      }
    }
  }

  throw lastError || new Error('fetchWithAuth: exhausted retries');
}

export function buildImageUrl(
  prompt: string,
  model: string,
  seed: number,
  width: number,
  height: number,
  enhance: boolean,
  safe: boolean
): string {
  const params = new URLSearchParams();
  params.append('model', model);
  params.append('seed', String(seed));
  params.append('width', String(width));
  params.append('height', String(height));
  if (enhance) params.append('enhance', 'true');
  params.append('nologo', 'true');
  params.append('private', 'true');
  params.append('safe', String(safe));
  const encodedPrompt = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`;
}
