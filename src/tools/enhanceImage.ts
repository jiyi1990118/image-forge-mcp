import { readFile } from 'fs/promises';
import { enhanceWithRealEsrgan, type RealEsrganModel } from '../services/upscale/realesrganService.js';
import { removeBackgroundImage, type RemoveBackgroundStrategy } from '../services/enhance/backgroundRemovalService.js';
import { formatBytes } from '../services/enhance/compressService.js';
import { noBackgroundOutputPath } from '../utils/pathUtils.js';

export async function handleEnhanceImage(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; data?: string; mimeType?: string; text: string }>; isError?: boolean }> {
  const inputPath = String(args.inputPath || '').trim();
  if (!inputPath) {
    return { content: [{ type: 'text', text: 'Error: inputPath is required.' }], isError: true };
  }

  const scaleRaw = args.scale ? Number(args.scale) : 2;
  const scale = scaleRaw === 3 || scaleRaw === 4 ? scaleRaw : 2;
  const model = (args.model ? String(args.model) : 'realesr-animevideov3') as RealEsrganModel;
  const outputPath = args.outputPath ? String(args.outputPath) : undefined;
  const autoDownload = args.autoDownload !== undefined ? args.autoDownload !== false : true;
  const timeoutMs = args.timeoutMs ? Number(args.timeoutMs) : 120000;
  const removeBackground = args.removeBackground === true;
  const removeBackgroundStrategy: RemoveBackgroundStrategy = args.removeBackgroundStrategy === 'default'
    || args.removeBackgroundStrategy === 'preserve-light-subject'
    || args.removeBackgroundStrategy === 'clean-edge'
    ? args.removeBackgroundStrategy
    : 'auto';

  const result = await enhanceWithRealEsrgan({
    inputPath,
    outputPath,
    model,
    scale,
    autoDownload,
    timeoutMs,
  });

  let finalOutputPath = result.outputPath;
  let backgroundInfo = '';
  if (removeBackground) {
    const bgResult = await removeBackgroundImage({
      inputPath: result.outputPath,
      outputPath: noBackgroundOutputPath(result.outputPath),
      strategy: removeBackgroundStrategy,
    });
    finalOutputPath = bgResult.outputPath;
    backgroundInfo = `\nBackground removed: ${bgResult.modelUsed} (${bgResult.strategy})`;
  }

  const data = (await readFile(finalOutputPath)).toString('base64');
  const size = Buffer.byteLength(data, 'base64');

  let text = `Enhanced image with Real-ESRGAN\n\n`;
  text += `Input: ${result.inputPath}\n`;
  text += `Output: ${finalOutputPath}\n`;
  text += `Model: ${result.model}\n`;
  text += `Scale: ${result.scale}x\n`;
  text += `Output size: ${formatBytes(size)}\n`;
  text += `Binary: ${result.binaryPath}\n`;
  text += `Downloaded binary this run: ${result.downloaded ? 'yes' : 'no'}`;
  text += backgroundInfo;
  if (result.stderr.trim()) {
    text += `\n\nReal-ESRGAN stderr:\n${result.stderr.trim().slice(0, 2000)}`;
  }

  return {
    content: [
      { type: 'image', data, mimeType: 'image/png', text: '' },
      { type: 'text', text },
    ],
  };
}
