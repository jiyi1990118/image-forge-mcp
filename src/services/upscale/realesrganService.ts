import { access, chmod, mkdir, rm, stat, writeFile } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { basename, dirname, extname, join } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import extract from 'extract-zip';
import sharp from 'sharp';
import { log } from '../../utils/logger.js';

const RELEASE_TAG = 'v0.2.5.0';
const RELEASE_BASE = `https://github.com/xinntao/Real-ESRGAN/releases/download/${RELEASE_TAG}`;
const ensureLocks = new Map<string, Promise<{ binaryPath: string; downloaded: boolean }>>();

export const REALESRGAN_MODELS = [
  'realesrgan-x4plus',
  'realesrgan-x4plus-anime',
  'realesr-animevideov3',
] as const;

export type RealEsrganModel = (typeof REALESRGAN_MODELS)[number];

export interface RealEsrganPackageInfo {
  platform: 'windows' | 'macos' | 'ubuntu';
  url: string;
  zipName: string;
  binaryName: string;
}

export interface RealEsrganOptions {
  inputPath: string;
  outputPath?: string;
  model: RealEsrganModel;
  scale: 2 | 3 | 4;
  autoDownload: boolean;
  timeoutMs: number;
}

export interface RealEsrganResult {
  inputPath: string;
  outputPath: string;
  binaryPath: string;
  model: RealEsrganModel;
  scale: number;
  downloaded: boolean;
  stdout: string;
  stderr: string;
}

export interface RealEsrganAvailability {
  supportedPlatform: boolean;
  binaryAvailable: boolean;
  binaryPath?: string;
  downloaded: boolean;
  vulkanLikelyAvailable: boolean;
  available: boolean;
  reason?: string;
}

export function getRealEsrganPackageInfo(platform = process.platform): RealEsrganPackageInfo {
  if (platform === 'win32') {
    return {
      platform: 'windows',
      zipName: 'realesrgan-ncnn-vulkan-20220424-windows.zip',
      binaryName: 'realesrgan-ncnn-vulkan.exe',
      url: resolveDownloadUrl(`${RELEASE_BASE}/realesrgan-ncnn-vulkan-20220424-windows.zip`),
    };
  }
  if (platform === 'darwin') {
    return {
      platform: 'macos',
      zipName: 'realesrgan-ncnn-vulkan-20220424-macos.zip',
      binaryName: 'realesrgan-ncnn-vulkan',
      url: resolveDownloadUrl(`${RELEASE_BASE}/realesrgan-ncnn-vulkan-20220424-macos.zip`),
    };
  }
  if (platform === 'linux') {
    return {
      platform: 'ubuntu',
      zipName: 'realesrgan-ncnn-vulkan-20220424-ubuntu.zip',
      binaryName: 'realesrgan-ncnn-vulkan',
      url: resolveDownloadUrl(`${RELEASE_BASE}/realesrgan-ncnn-vulkan-20220424-ubuntu.zip`),
    };
  }
  throw new Error(`Unsupported platform for Real-ESRGAN auto-download: ${platform}`);
}

function projectRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // src/services/upscale during ts-node-like tests, dist/services/upscale after build.
  return join(here, '..', '..', '..');
}

function resolveDownloadUrl(url: string): string {
  const base = process.env.REALESRGAN_DOWNLOAD_BASE_URL?.trim();
  if (!base) return url;
  if (base.includes('{url}')) return base.replace('{url}', url);
  return `${base.replace(/\/$/, '')}/${url}`;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function cacheRoot(): string {
  return process.env.REALESRGAN_CACHE_DIR || join(projectRoot(), '.cache', 'realesrgan', RELEASE_TAG);
}

function defaultInstallDir(info = getRealEsrganPackageInfo()): string {
  return join(cacheRoot(), info.platform);
}

async function findBinary(dir: string, binaryName: string): Promise<string | null> {
  const candidates = [
    join(dir, binaryName),
    join(dir, 'realesrgan-ncnn-vulkan-20220424', binaryName),
  ];
  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }
  return null;
}

async function downloadFile(url: string, outputPath: string): Promise<void> {
  log(`Downloading Real-ESRGAN: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download Real-ESRGAN (${response.status} ${response.statusText})`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(outputPath, buffer);
}

export async function ensureRealEsrgan(autoDownload: boolean): Promise<{ binaryPath: string; downloaded: boolean }> {
  const explicit = process.env.REALESRGAN_PATH;
  if (explicit) {
    if (!(await exists(explicit))) {
      throw new Error(`REALESRGAN_PATH does not exist: ${explicit}`);
    }
    return { binaryPath: explicit, downloaded: false };
  }

  const info = getRealEsrganPackageInfo();
  const installDir = defaultInstallDir(info);
  const existing = await findBinary(installDir, info.binaryName);
  if (existing) return { binaryPath: existing, downloaded: false };

  if (!autoDownload) {
    throw new Error(
      `Real-ESRGAN binary not found. Set REALESRGAN_PATH or call with autoDownload=true.`
    );
  }

  const existingLock = ensureLocks.get(installDir);
  if (existingLock) return existingLock;

  const lock = downloadAndExtractRealEsrgan(info, installDir);
  ensureLocks.set(installDir, lock);
  try {
    return await lock;
  } finally {
    ensureLocks.delete(installDir);
  }
}

async function downloadAndExtractRealEsrgan(
  info: RealEsrganPackageInfo,
  installDir: string
): Promise<{ binaryPath: string; downloaded: boolean }> {
  await mkdir(installDir, { recursive: true });
  const zipPath = join(installDir, info.zipName);
  await downloadFile(info.url, zipPath);
  log(`Extracting Real-ESRGAN to ${installDir}`);
  await extract(zipPath, { dir: installDir });

  const binaryPath = await findBinary(installDir, info.binaryName);
  if (!binaryPath) {
    throw new Error(`Downloaded Real-ESRGAN but could not find ${info.binaryName} in ${installDir}`);
  }
  if (process.platform !== 'win32') {
    await chmod(binaryPath, 0o755).catch(() => {});
  }
  return { binaryPath, downloaded: true };
}

function outputPathFor(inputPath: string, outputPath: string | undefined, scale: number): string {
  if (outputPath) return outputPath;
  const dir = dirname(inputPath);
  const base = basename(inputPath, extname(inputPath));
  return join(dir, `${base}_realesrgan_x${scale}.png`);
}

function runProcess(command: string, args: string[], cwd: string, timeoutMs: number): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const detached = process.platform !== 'win32';
    const child = spawn(command, args, { cwd, detached, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let killTimer: NodeJS.Timeout | null = null;
    const killChild = (signal: NodeJS.Signals) => {
      if (detached && child.pid) {
        try {
          process.kill(-child.pid, signal);
          return;
        } catch {
          // Fall back to direct child kill below.
        }
      }
      child.kill(signal);
    };
    const timer = setTimeout(() => {
      timedOut = true;
      killChild('SIGTERM');
      killTimer = setTimeout(() => {
        killChild('SIGKILL');
      }, 5000);
    }, timeoutMs);

    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (killTimer) clearTimeout(killTimer);
      if (timedOut) {
        reject(new Error(`Real-ESRGAN timed out after ${Math.round(timeoutMs / 1000)}s`));
        return;
      }
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`Real-ESRGAN exited with code ${code}. stderr: ${stderr.slice(0, 2000)}`));
    });
  });
}

export async function checkRealEsrganAvailability(
  options: { autoDownload?: boolean } = {}
): Promise<RealEsrganAvailability> {
  const autoDownload = options.autoDownload === true;

  try {
    getRealEsrganPackageInfo();
  } catch (error) {
    return {
      supportedPlatform: false,
      binaryAvailable: false,
      downloaded: false,
      vulkanLikelyAvailable: false,
      available: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }

  try {
    const ensured = await ensureRealEsrgan(autoDownload);
    const binaryPath = ensured.binaryPath;

    const versionOk = await quickValidateBinary(binaryPath);
    if (!versionOk) {
      return {
        supportedPlatform: true,
        binaryAvailable: true,
        binaryPath,
        downloaded: ensured.downloaded,
        vulkanLikelyAvailable: false,
        available: false,
        reason: 'Real-ESRGAN binary exists but failed quick validation (no Vulkan support or missing GPU driver)',
      };
    }

    return {
      supportedPlatform: true,
      binaryAvailable: true,
      binaryPath,
      downloaded: ensured.downloaded,
      vulkanLikelyAvailable: true,
      available: true,
    };
  } catch (error) {
    return {
      supportedPlatform: true,
      binaryAvailable: false,
      downloaded: false,
      vulkanLikelyAvailable: false,
      available: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Quick validation: run `realesrgan-ncnn-vulkan --version` to verify the binary
 * actually works (Vulkan driver available). Uses a short 5s timeout.
 */
async function quickValidateBinary(binaryPath: string): Promise<boolean> {
  try {
    await runProcess(binaryPath, ['--version'], dirname(binaryPath), 5000);
    return true;
  } catch {
    return false;
  }
}

async function prepareOpaqueInput(inputPath: string, outputDir: string): Promise<{
  runInputPath: string;
  tempDir: string | null;
  restoreAlpha: (upscaledPath: string, finalPath: string) => Promise<void>;
}> {
  const meta = await sharp(inputPath).metadata();
  if (!meta.hasAlpha) {
    return {
      runInputPath: inputPath,
      tempDir: null,
      restoreAlpha: async (upscaledPath, finalPath) => {
        if (upscaledPath !== finalPath) {
          await sharp(upscaledPath).png({ quality: 95 }).toFile(finalPath);
        }
      },
    };
  }

  // Real-ESRGAN ncnn-vulkan does not handle alpha reliably. Run RGB only,
  // then upscale the original alpha mask and attach it back to the result.
  const tempDir = join(outputDir, `__tmp_realesrgan_${Date.now()}_${Math.floor(Math.random() * 10000)}`);
  await mkdir(tempDir, { recursive: true });
  const rgbInputPath = join(tempDir, 'input_rgb.png');
  const alphaPath = join(tempDir, 'alpha.png');

  await sharp(inputPath)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ quality: 95 })
    .toFile(rgbInputPath);
  await sharp(inputPath)
    .ensureAlpha()
    .extractChannel('alpha')
    .png({ quality: 95 })
    .toFile(alphaPath);

  return {
    runInputPath: rgbInputPath,
    tempDir,
    restoreAlpha: async (upscaledPath, finalPath) => {
      const upMeta = await sharp(upscaledPath).metadata();
      if (!upMeta.width || !upMeta.height) {
        throw new Error(`Could not read Real-ESRGAN output size: ${upscaledPath}`);
      }
      const alphaBuffer = await sharp(alphaPath)
        .resize({ width: upMeta.width, height: upMeta.height, fit: 'fill' })
        .toBuffer();
      await sharp(upscaledPath)
        .removeAlpha()
        .joinChannel(alphaBuffer)
        .png({ quality: 95 })
        .toFile(finalPath);
    },
  };
}

export async function enhanceWithRealEsrgan(options: RealEsrganOptions): Promise<RealEsrganResult> {
  const inputOk = await exists(options.inputPath);
  if (!inputOk) throw new Error(`input file not found: ${options.inputPath}`);
  if (!REALESRGAN_MODELS.includes(options.model)) {
    throw new Error(`Unsupported Real-ESRGAN model: ${options.model}`);
  }

  const { binaryPath, downloaded } = await ensureRealEsrgan(options.autoDownload);
  const outputPath = outputPathFor(options.inputPath, options.outputPath, options.scale);
  await mkdir(dirname(outputPath), { recursive: true });

  const alphaAware = await prepareOpaqueInput(options.inputPath, dirname(outputPath));
  const runOutputPath = alphaAware.tempDir ? join(alphaAware.tempDir, 'upscaled_rgb.png') : outputPath;

  const args = [
    '-i', alphaAware.runInputPath,
    '-o', runOutputPath,
    '-n', options.model,
    '-s', String(options.scale),
  ];

  log(`Running Real-ESRGAN: ${binaryPath} ${args.join(' ')}`);
  let stdout = '';
  let stderr = '';
  try {
    const result = await runProcess(binaryPath, args, dirname(binaryPath), options.timeoutMs);
    stdout = result.stdout;
    stderr = result.stderr;
    await alphaAware.restoreAlpha(runOutputPath, outputPath);
  } finally {
    if (alphaAware.tempDir) {
      await rm(alphaAware.tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  const outputStats = await stat(outputPath).catch(() => null);
  if (!outputStats || outputStats.size === 0) {
    throw new Error(`Real-ESRGAN completed but output file was not created: ${outputPath}`);
  }

  return {
    inputPath: options.inputPath,
    outputPath,
    binaryPath,
    model: options.model,
    scale: options.scale,
    downloaded,
    stdout,
    stderr,
  };
}
