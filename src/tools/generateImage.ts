import { readFileSync } from 'fs';
import { basename, dirname, extname, join } from 'path';
import { generateImage, generateImageUrlOnly } from '../services/pollinations/imageService.js';
import { optimizePrompt, shouldOptimize } from '../services/optimizer/promptOptimizer.js';
import { compressImage, formatBytes } from '../services/enhance/compressService.js';
import { applyClarity, DEFAULT_CLARITY } from '../services/enhance/clarityService.js';
import { removeBackgroundImage, type RemoveBackgroundStrategy } from '../services/enhance/backgroundRemovalService.js';
import { enhanceGeneratedImage, type EnhancementBackend, type EnhancementFallback } from '../services/upscale/generationEnhancementService.js';
import { selectRealEsrganModel } from '../services/upscale/modelSelectionService.js';
import { DEFAULTS } from '../config/constants.js';
import { randomSeed } from '../utils/fileUtils.js';
import { noBackgroundOutputPath } from '../utils/pathUtils.js';
import { log, error } from '../utils/logger.js';
import type { AuthConfig } from '../services/pollinations/client.js';

const ENGLISH_ASSET_TERMS = [
  'asset', 'assets', 'icon', 'icons', 'sprite', 'sprites', 'item', 'items',
  'prop', 'props', 'weapon', 'weapons', 'sword', 'swords', 'blade', 'blades',
  'broadsword', 'staff', 'wand', 'shield', 'armor', 'armour', 'equipment',
  'gear', 'loot', 'pickup', 'inventory', 'collectible', 'collectibles',
  'accessory', 'accessories', 'trinket', 'trinkets', 'relic', 'relics',
  'artifact', 'artifacts', 'amulet', 'amulets', 'ring', 'rings', 'gem', 'gems',
  'gemstone', 'gemstones', 'potion', 'potions', 'bottle', 'bottles', 'vial',
  'vials', 'flask', 'flasks', 'chest', 'chests', 'treasure', 'treasures',
  'scroll', 'scrolls', 'book', 'books', 'tome', 'tomes', 'grimoire',
  'grimoires', 'key', 'keys', 'coin', 'coins', 'badge', 'badges', 'emblem',
  'emblems', 'token', 'tokens', 'card', 'cards', 'orb', 'orbs', 'crystal',
  'crystals', 'helmet', 'helm', 'boots', 'gloves', 'gauntlet', 'gauntlets',
  'bow', 'bows', 'crossbow', 'crossbows', 'arrow', 'arrows', 'axe', 'axes',
  'hammer', 'hammers', 'mace', 'maces', 'spear', 'spears', 'dagger', 'daggers',
  'katana', 'katanas',
];
const CHINESE_ASSET_TERMS = [
  '游戏', '素材', '图标', '道具', '物品', '武器', '装备', '剑', '刀',
  '法杖', '魔杖', '盾牌', '盔甲', '背包', '拾取物', '收藏品',
  '饰品', '护符', '戒指', '宝石', '水晶', '药水', '瓶子', '卷轴',
  '书籍', '魔法书', '钥匙', '金币', '徽章', '纹章', '令牌', '卡牌',
  '宝箱', '宝物', '头盔', '靴子', '手套', '弓', '弩', '箭', '斧',
  '锤', '矛', '匕首', '武士刀',
];

const ENGLISH_WEAPON_TERMS = [
  'weapon', 'weapons', 'sword', 'swords', 'blade', 'blades', 'broadsword',
  'bow', 'bows', 'crossbow', 'crossbows', 'arrow', 'arrows', 'axe', 'axes',
  'hammer', 'hammers', 'mace', 'maces', 'spear', 'spears', 'dagger', 'daggers',
  'katana', 'katanas', 'staff', 'wand',
];
const CHINESE_WEAPON_TERMS = [
  '武器', '剑', '刀', '法杖', '魔杖', '弓', '弩', '箭', '斧', '锤', '矛', '匕首', '武士刀',
];
const ENGLISH_BLADED_WEAPON_TERMS = [
  'sword', 'swords', 'blade', 'blades', 'broadsword', 'dagger', 'daggers', 'katana', 'katanas',
];
const CHINESE_BLADED_WEAPON_TERMS = ['剑', '刀', '匕首', '武士刀'];
const CHINESE_CULTURAL_TERMS = [
  '中国', '中文', '古风', '国风', '仙侠', '武侠', '神剑', '倚天', '倚天剑', '青龙', '龙纹', '水墨',
];
const ENGLISH_ORGANIC_TERMS = [
  'mushroom', 'mushrooms', 'fungus', 'fungi', 'plant', 'plants', 'flower', 'flowers',
  'tree', 'trees', 'leaf', 'leaves', 'grass', 'vine', 'vines', 'fruit', 'fruits',
  'vegetable', 'vegetables', 'herb', 'herbs', 'seed', 'seeds', 'sprout', 'sprouts',
];
const CHINESE_ORGANIC_TERMS = [
  '蘑菇', '小蘑菇', '菌菇', '植物', '花', '花朵', '树', '树木', '叶', '叶子',
  '草', '藤蔓', '水果', '果实', '蔬菜', '草药', '种子', '嫩芽',
];

const NO_TEXT_PROMPT = 'No text, no letters, no words, no readable signs, no logos, no watermark.';
const ASSET_PROMPT_WITHOUT_BG = 'game asset icon, complete object, fully visible, centered, uncropped, clean silhouette, sharp outline, well-defined edges.';
const ASSET_PROMPT = `${ASSET_PROMPT_WITHOUT_BG} plain white background.`;
const WEAPON_PROMPT = 'single weapon only, one complete object, no duplicate weapons, no crossed weapons, no extra blade, no extra handle, no scabbard.';
const BLADED_WEAPON_PROMPT = 'one blade, one handle, straight continuous blade, symmetric weapon silhouette, product view, not a pair.';
const ORGANIC_PROMPT = 'single organic object, smooth continuous natural shape, seamless stem, no horizontal seam, no ring band, no belt, no mechanical joint, no segmented body.';

const BACKGROUND_COLOR_TERMS = [
  'background', 'bg', 'transparent',
  'white background', 'black background', 'blue background', 'red background',
  'green background', 'gray background', 'grey background', 'dark background',
  'light background', 'gradient background', 'color background',
  'plain white', 'plain black', 'solid background',
  'isolated', 'no background', 'clear background',
];

function tokenizeEnglish(prompt: string): string[] {
  return prompt.toLowerCase().match(/[a-z0-9]+/g) || [];
}

function hasAnyToken(tokens: string[], terms: string[]): boolean {
  return terms.some((term) => tokens.includes(term));
}

function hasAnySubstring(prompt: string, terms: string[]): boolean {
  return terms.some((term) => prompt.includes(term));
}

function shouldUseAssetPipeline(prompt: string): boolean {
  const tokens = tokenizeEnglish(prompt);
  return hasAnyToken(tokens, ENGLISH_ASSET_TERMS) || hasAnySubstring(prompt, CHINESE_ASSET_TERMS);
}

function isWeaponAssetPrompt(prompt: string): boolean {
  const tokens = tokenizeEnglish(prompt);
  return hasAnyToken(tokens, ENGLISH_WEAPON_TERMS) || hasAnySubstring(prompt, CHINESE_WEAPON_TERMS);
}

function isBladedWeaponPrompt(prompt: string): boolean {
  const tokens = tokenizeEnglish(prompt);
  return hasAnyToken(tokens, ENGLISH_BLADED_WEAPON_TERMS) || hasAnySubstring(prompt, CHINESE_BLADED_WEAPON_TERMS);
}

function isOrganicAssetPrompt(prompt: string): boolean {
  const tokens = tokenizeEnglish(prompt);
  return hasAnyToken(tokens, ENGLISH_ORGANIC_TERMS) || hasAnySubstring(prompt, CHINESE_ORGANIC_TERMS);
}

function shouldUseQwenImage(prompt: string): boolean {
  return shouldUseAssetPipeline(prompt) && hasAnySubstring(prompt, CHINESE_CULTURAL_TERMS);
}

function addNoTextConstraint(prompt: string): string {
  return `${prompt}, ${NO_TEXT_PROMPT}`;
}

function addAssetConstraint(prompt: string): string {
  if (!shouldUseAssetPipeline(prompt)) return prompt;

  const promptLower = prompt.toLowerCase();
  const hasBackgroundColor = BACKGROUND_COLOR_TERMS.some((term) => promptLower.includes(term));

  const constraints = [hasBackgroundColor ? ASSET_PROMPT_WITHOUT_BG : ASSET_PROMPT];
  if (isWeaponAssetPrompt(prompt)) constraints.push(WEAPON_PROMPT);
  if (isBladedWeaponPrompt(prompt)) constraints.push(BLADED_WEAPON_PROMPT);
  if (isOrganicAssetPrompt(prompt)) constraints.push(ORGANIC_PROMPT);
  return `${prompt}, ${constraints.join(' ')}`;
}

function selectImageModel(prompt: string, explicitModel: unknown): string {
  if (explicitModel) return String(explicitModel);
  return shouldUseQwenImage(prompt) ? 'qwen-image' : DEFAULTS.IMAGE_MODEL;
}

function shouldApplyNoTextConstraint(value: unknown): boolean {
  return value !== false;
}

function parseRemoveBackgroundStrategy(value: unknown): RemoveBackgroundStrategy {
  return value === 'default' || value === 'preserve-light-subject' || value === 'clean-edge'
    ? value
    : 'auto';
}

function parseScale(value: unknown): 2 | 3 | 4 {
  const numeric = Number(value || 2);
  return numeric === 3 || numeric === 4 ? numeric : 2;
}

function parseReturnMode(value: unknown): 'path' | 'binary' | 'both' {
  return value === 'binary' || value === 'both' ? value : 'path';
}

function parseEnhanceBackend(value: unknown): EnhancementBackend {
  return value === 'realesrgan' || value === 'sharp' || value === 'none' ? value : 'auto';
}

function parseEnhanceFallback(value: unknown): EnhancementFallback {
  return value === 'none' ? 'none' : 'sharp';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sanitizeFileName(name: string): string {
  return name.replace(/[/\\]/g, '').replace(/^\.+/, '');
}

export async function handleGenerateImage(
  args: Record<string, unknown>,
  authConfig: AuthConfig | null
): Promise<{ content: Array<{ type: string; data?: string; mimeType?: string; text: string }>; isError?: boolean }> {
  const prompt = String(args.prompt || '').trim();
  if (!prompt) {
    return {
      content: [{ type: 'text', text: 'Error: prompt is required and must be a non-empty string.' }],
      isError: true,
    };
  }
  const autoOptimize = args.autoOptimize !== undefined ? args.autoOptimize !== false : DEFAULTS.IMAGE_AUTO_OPTIMIZE;
  const optimizeStyle = String(args.optimizeStyle || DEFAULTS.IMAGE_OPTIMIZE_STYLE);

  let finalPrompt = prompt;
  let optimizedFrom: string | null = null;

  if (autoOptimize && shouldOptimize(prompt)) {
    log('Auto-optimizing prompt...');
    const result = await optimizePrompt(prompt, optimizeStyle, 30, authConfig);
    finalPrompt = result.optimizedPrompt;
    optimizedFrom = prompt;
  }

  const constrainedPrompt = addAssetConstraint(finalPrompt);
  const generationPrompt = shouldApplyNoTextConstraint(args.noTextConstraint)
    ? addNoTextConstraint(constrainedPrompt)
    : constrainedPrompt;
  const returnMode = parseReturnMode(args.returnMode);

  const result = await generateImage({
    prompt: generationPrompt,
    model: selectImageModel(prompt, args.model),
    seed: args.seed ? Number(args.seed) : randomSeed(),
    width: args.width ? clamp(Math.floor(Number(args.width)), 64, 2048) : DEFAULTS.IMAGE_WIDTH,
    height: args.height ? clamp(Math.floor(Number(args.height)), 64, 2048) : DEFAULTS.IMAGE_HEIGHT,
    enhance: args.enhance !== undefined ? args.enhance === true : DEFAULTS.IMAGE_ENHANCE,
    safe: args.safe !== undefined ? args.safe === true : DEFAULTS.IMAGE_SAFE,
    outputPath: args.outputPath ? String(args.outputPath) : DEFAULTS.OUTPUT_DIR,
    fileName: args.fileName ? sanitizeFileName(String(args.fileName)) || undefined : undefined,
    format: args.format ? String(args.format) : 'png',
    includeData: returnMode !== 'path',
    authConfig,
  });

  const rawPath = result.filePath;

  const denoise = args.denoise !== undefined ? args.denoise !== false : DEFAULT_CLARITY.denoise;
  const denoiseMethod: 'median' | 'neural' = args.denoiseMethod === 'neural' ? 'neural' : 'median';
  const denoiseRadius = args.denoiseRadius ? clamp(Math.floor(Number(args.denoiseRadius)), 1, 3) : DEFAULT_CLARITY.denoiseRadius;
  const sharpen = args.sharpen === true;
  const enhanceContrast = args.enhanceContrast === true;
  const realEsrgan = args.realEsrgan !== undefined ? args.realEsrgan !== false : true;
  const enhanceBackend = parseEnhanceBackend(args.enhanceBackend);
  const enhanceFallback = parseEnhanceFallback(args.enhanceFallback);
  const requestedRealEsrganModel = args.realEsrganModel ? String(args.realEsrganModel) : 'auto';
  const realEsrganModel = selectRealEsrganModel(prompt, requestedRealEsrganModel);
  const realEsrganScale = parseScale(args.realEsrganScale);
  const realEsrganAutoDownload = args.realEsrganAutoDownload !== undefined ? args.realEsrganAutoDownload !== false : true;
  const realEsrganTimeoutMs = args.realEsrganTimeoutMs ? clamp(Math.floor(Number(args.realEsrganTimeoutMs)), 10000, 600000) : 120000;

  let removeBackground: boolean;
  if (args.removeBackground !== undefined) {
    removeBackground = args.removeBackground === true;
  } else {
    removeBackground = shouldUseAssetPipeline(prompt);
  }
  const removeBackgroundStrategy = parseRemoveBackgroundStrategy(args.removeBackgroundStrategy);

  const clarityActive = denoise || sharpen || enhanceContrast;
  const dir = dirname(rawPath);
  const base = basename(rawPath, extname(rawPath));

  let finalPath = rawPath;
  let processedPath: string | null = null;
  let enhancementPath: string | null = null;
  let processingInfo = '';
  let mimeType = result.mimeType;

  try {
    if (clarityActive) {
      processedPath = join(dir, `${base}_processed.png`);
      finalPath = processedPath;
      mimeType = 'image/png';

      log('Applying clarity pipeline...');
      const clarityRes = await applyClarity(rawPath, processedPath, {
        denoise,
        denoiseMethod,
        denoiseRadius,
        sharpen,
        enhanceContrast,
      });
      processingInfo += `\nClarity: ${clarityRes.steps.join(' + ') || 'none'}${clarityRes.denoiseFallback ? ' (neural fallback to median)' : ''}`;
    }

    if (realEsrgan && enhanceBackend !== 'none') {
      enhancementPath = join(dir, `${base}_enhanced.png`);
      const enhancement = await enhanceGeneratedImage({
        inputPath: finalPath,
        outputPath: enhancementPath,
        enabled: true,
        backend: enhanceBackend,
        fallback: enhanceFallback,
        model: realEsrganModel,
        scale: realEsrganScale,
        autoDownload: realEsrganAutoDownload,
        timeoutMs: realEsrganTimeoutMs,
      });
      finalPath = enhancement.outputPath;
      mimeType = 'image/png';
      processingInfo += `\nEnhancement: Real-ESRGAN model: ${realEsrganModel}. ${enhancement.message}`;
      if (enhancement.binaryPath) {
        processingInfo += `\nReal-ESRGAN binary: ${enhancement.binaryPath}`;
      }
    }

    if (removeBackground) {
      const bgOutputPath = noBackgroundOutputPath(finalPath);
      log('Removing background...');
      const bgRes = await removeBackgroundImage({ inputPath: finalPath, outputPath: bgOutputPath, strategy: removeBackgroundStrategy });
      finalPath = bgRes.outputPath;
      mimeType = 'image/png';
      processingInfo += `\nBackground removed: ${bgRes.modelUsed} (${bgRes.strategy})`;
    }

    if (args.compress !== false && finalPath.endsWith('.png')) {
      const compressResult = await compressImage(finalPath);
      if (compressResult.warning) {
        processingInfo += `\nCompression warning: ${compressResult.warning}`;
      } else if (compressResult.compressed) {
        processingInfo += `\nCompression: ${formatBytes(compressResult.originalSize)} -> ${formatBytes(compressResult.compressedSize)}`;
      } else {
        processingInfo += `\nCompression: skipped (${formatBytes(compressResult.originalSize)})`;
      }
    }
  } catch (postError) {
    const errorMsg = postError instanceof Error ? postError.message : String(postError);
    error('Post-processing failed:', errorMsg);

    const partialContent: Array<{ type: string; data?: string; mimeType?: string; text: string }> = [];
    if (returnMode === 'binary' || returnMode === 'both') {
      partialContent.push({ type: 'image', data: readFileSync(rawPath).toString('base64'), mimeType: result.mimeType, text: '' });
    }

    let partialText = `Post-processing failed. Raw image saved to: ${rawPath}`;
    if (optimizedFrom) {
      partialText += `\n\nOptimized from original: "${optimizedFrom}"`;
    }
    partialText += `\n\nCompleted steps:${processingInfo || ' (none)'}`;
    partialText += `\n\nFailed: ${errorMsg}`;
    partialContent.push({ type: 'text', text: partialText });

    return { content: partialContent, isError: true };
  }

  const content: Array<{ type: string; data?: string; mimeType?: string; text: string }> = [];
  if (returnMode === 'binary' || returnMode === 'both') {
    content.push({ type: 'image', data: readFileSync(finalPath).toString('base64'), mimeType, text: '' });
  }

  let text = `Generated image from prompt: "${generationPrompt}"`;
  if (optimizedFrom) {
    text += `\n\nOptimized from original: "${optimizedFrom}"`;
  }
  text += `\n\nImage metadata: ${JSON.stringify(result.metadata, null, 2)}`;
  text += `\n\nRaw image saved to: ${rawPath}`;
  if (processedPath) {
    text += `\nProcessed image saved to: ${processedPath}`;
  }
  if (enhancementPath) {
    text += `\nEnhanced image saved to: ${enhancementPath}`;
  }
  text += `\nFinal image saved to: ${finalPath}`;
  text += processingInfo;

  if (returnMode === 'path' || returnMode === 'both') {
    content.push({ type: 'text', text });
  } else {
    content.push({ type: 'text', text: `Final image saved to: ${finalPath}${processingInfo}` });
  }

  return { content };
}

export async function handleGenerateImageUrl(
  args: Record<string, unknown>,
  authConfig: AuthConfig | null
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  const prompt = String(args.prompt || '').trim();
  if (!prompt) {
    return { content: [{ type: 'text', text: 'Error: prompt is required and must be a non-empty string.' }], isError: true };
  }
  const autoOptimize = args.autoOptimize !== undefined ? args.autoOptimize !== false : DEFAULTS.IMAGE_AUTO_OPTIMIZE;
  const optimizeStyle = String(args.optimizeStyle || DEFAULTS.IMAGE_OPTIMIZE_STYLE);

  let finalPrompt = prompt;
  let optimizedFrom: string | null = null;

  if (autoOptimize && shouldOptimize(prompt)) {
    const result = await optimizePrompt(prompt, optimizeStyle, 30, authConfig);
    finalPrompt = result.optimizedPrompt;
    optimizedFrom = prompt;
  }

  const constrainedPrompt = addAssetConstraint(finalPrompt);
  const generationPrompt = shouldApplyNoTextConstraint(args.noTextConstraint)
    ? addNoTextConstraint(constrainedPrompt)
    : constrainedPrompt;

  const result = await generateImageUrlOnly({
    prompt: generationPrompt,
    model: selectImageModel(prompt, args.model),
    seed: args.seed ? Number(args.seed) : randomSeed(),
    width: args.width ? Number(args.width) : DEFAULTS.IMAGE_WIDTH,
    height: args.height ? Number(args.height) : DEFAULTS.IMAGE_HEIGHT,
    enhance: args.enhance !== undefined ? args.enhance === true : DEFAULTS.IMAGE_ENHANCE,
    safe: args.safe !== undefined ? args.safe === true : DEFAULTS.IMAGE_SAFE,
    authConfig,
  });

  let text = `Image URL: ${result.imageUrl}`;
  if (optimizedFrom) {
    text += `\n\nPrompt was optimized from: "${optimizedFrom}"`;
  }
  text += `\n\nMetadata: ${JSON.stringify(result.metadata, null, 2)}`;

  return { content: [{ type: 'text', text }] };
}
