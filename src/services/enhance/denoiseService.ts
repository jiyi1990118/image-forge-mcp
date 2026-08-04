import { access, writeFile } from 'fs/promises';
import { log } from '../../utils/logger.js';

/**
 * 神经降噪服务 (方案 B) — 复用项目已有的 onnxruntime-node（@imgly 依赖）。
 *
 * 模型策略：
 * - 优先读 env `DENOISE_MODEL_PATH` 指向的本地 ONNX 降噪模型（DnCNN 类，[1,3,H,W]->[1,3,H,W]）。
 * - 模型不可得 / 推理失败时抛出 NeuralDenoiseUnavailable，由调用方回退到 median。
 *
 * 不内置默认模型下载（避免硬编码未验证 URL）。用户可放置 DnCNN ONNX 模型并设置
 * DENOISE_MODEL_PATH 来启用神经降噪；否则自动回退 sharp.median。
 */

export class NeuralDenoiseUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NeuralDenoiseUnavailable';
  }
}

export interface NeuralDenoiseResult {
  outputPath: string;
  modelUsed: string;
}

// HWC uint8 -> CHW float32 [0,1] (LUT avoids per-pixel division)
export function hwcToChw(rgb: Buffer, width: number, height: number): Float32Array {
  const plane = width * height;
  const div255 = new Float32Array(256);
  for (let i = 0; i < 256; i++) div255[i] = i / 255;

  const input = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    const src = i * 3;
    input[i] = div255[rgb[src]];
    input[plane + i] = div255[rgb[src + 1]];
    input[2 * plane + i] = div255[rgb[src + 2]];
  }
  return input;
}

// CHW float32 -> HWC uint8 (bitwise trunc + manual clamp avoids Math.round/max/min chain)
export function chwToHwc(output: Float32Array, width: number, height: number): Buffer {
  const plane = width * height;
  const outBuf = Buffer.alloc(plane * 3);
  for (let i = 0; i < plane; i++) {
    const v0 = (output[i] * 255 + 0.5) | 0;
    const v1 = (output[plane + i] * 255 + 0.5) | 0;
    const v2 = (output[2 * plane + i] * 255 + 0.5) | 0;
    outBuf[i * 3] = v0 < 0 ? 0 : v0 > 255 ? 255 : v0;
    outBuf[i * 3 + 1] = v1 < 0 ? 0 : v1 > 255 ? 255 : v1;
    outBuf[i * 3 + 2] = v2 < 0 ? 0 : v2 > 255 ? 255 : v2;
  }
  return outBuf;
}

function getModelPath(): string | null {
  const p = process.env.DENOISE_MODEL_PATH;
  return p && p.trim() ? p.trim() : null;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * 用 ONNX 神经模型对图片降噪。
 * 输入任意常见格式，输出 PNG（不透明 RGB）。
 */
export async function denoiseImageNeural(
  inputPath: string,
  outputPath: string
): Promise<NeuralDenoiseResult> {
  const modelPath = getModelPath();
  if (!modelPath || !(await fileExists(modelPath))) {
    throw new NeuralDenoiseUnavailable(
      `Neural denoise model not available (set DENOISE_MODEL_PATH to a DnCNN-style ONNX model).`
    );
  }

  log(`Neural denoise: loading model ${modelPath}`);
  const ort = await import('onnxruntime-node');
  let session: import('onnxruntime-node').InferenceSession;
  try {
    session = await ort.InferenceSession.create(modelPath);
  } catch (err) {
    throw new NeuralDenoiseUnavailable(
      `Failed to load denoise model: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const sharp = (await import('sharp')).default;
  let raw: { data: Buffer; info: import('sharp').OutputInfo };
  try {
    raw = await sharp(inputPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  } catch (err) {
    throw new NeuralDenoiseUnavailable(
      `Failed to read image for neural denoise: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const { data: rgb, info } = raw;
  const W = info.width;
  const H = info.height;
  if (info.channels !== 3) {
    throw new NeuralDenoiseUnavailable(
      `Expected 3-channel RGB after removeAlpha, got ${info.channels}`
    );
  }

  const input = hwcToChw(rgb, W, H);

  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];
  const tensor = new ort.Tensor('float32', input, [1, 3, H, W]);

  let output: Float32Array;
  try {
    const results = await session.run({ [inputName]: tensor });
    const out = results[outputName];
    if (!out || !(out.data instanceof Float32Array)) {
      throw new NeuralDenoiseUnavailable('Denoise model returned unexpected output type');
    }
    output = out.data as Float32Array;
  } catch (err) {
    if (err instanceof NeuralDenoiseUnavailable) throw err;
    throw new NeuralDenoiseUnavailable(
      `Neural denoise inference failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const outBuf = chwToHwc(output, W, H);

  await sharp(outBuf, { raw: { width: W, height: H, channels: 3 } })
    .png({ quality: 95 })
    .toFile(outputPath);

  log(`Neural denoise done: ${outputPath}`);
  return { outputPath, modelUsed: `onnx:${modelPath}` };
}