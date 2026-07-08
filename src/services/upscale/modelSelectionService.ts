import type { RealEsrganModel } from './realesrganService.js';

const ALLOWED_MODELS = ['auto', 'realesrgan-x4plus', 'realesrgan-x4plus-anime', 'realesr-animevideov3'] as const;
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
const ENGLISH_STYLIZED_TERMS = ['anime', 'manga', 'cartoon', 'illustration', 'painting', 'painted', 'art', 'artwork'];
const ENGLISH_SOFT_STYLIZED_TERMS = ['watercolor', 'aquarelle', 'ink', 'wash', 'sumi', 'brush', 'brushstroke', 'brushstrokes'];
const ENGLISH_HARD_UPSCALE_TERMS = ['upscale', 'upscaled', 'superresolution', 'superres', 'enlarge', 'enlarged', 'magnify', 'magnified'];
const ENGLISH_PHOTO_TERMS = ['photo', 'photograph', 'realistic', 'photorealistic', 'camera', 'dslr', 'lens'];
const CHINESE_ASSET_TERMS = [
  '素材', '图标', '道具', '物品', '武器', '装备', '剑', '刀', '法杖',
  '魔杖', '盾牌', '盔甲', '背包', '拾取物', '收藏品', '饰品', '护符',
  '戒指', '宝石', '水晶', '药水', '瓶子', '卷轴', '书籍', '魔法书',
  '钥匙', '金币', '徽章', '纹章', '令牌', '卡牌', '宝箱', '宝物',
  '头盔', '靴子', '手套', '弓', '弩', '箭', '斧', '锤', '矛',
  '匕首', '武士刀',
];
const CHINESE_STYLIZED_TERMS = ['插画', '二次元', '动漫', '动画', '卡通', '绘画', '原画'];
const CHINESE_SOFT_STYLIZED_TERMS = ['水墨', '国画', '水彩', '笔触', '晕染'];
const CHINESE_HARD_UPSCALE_TERMS = ['超分', '放大', '高清化', '高清放大'];
const CHINESE_PHOTO_TERMS = ['摄影', '照片', '写实', '人像'];

export type GenerateRealEsrganModel = RealEsrganModel | 'auto';

function tokenizeEnglish(prompt: string): string[] {
  return prompt.toLowerCase().match(/[a-z0-9]+/g) || [];
}

function hasAnyToken(tokens: string[], terms: string[]): boolean {
  return terms.some((term) => tokens.includes(term));
}

function hasAnySubstring(prompt: string, terms: string[]): boolean {
  return terms.some((term) => prompt.includes(term));
}

function parseRequestedModel(requestedModel: unknown): GenerateRealEsrganModel {
  return ALLOWED_MODELS.includes(requestedModel as GenerateRealEsrganModel)
    ? requestedModel as GenerateRealEsrganModel
    : 'auto';
}

export function selectRealEsrganModel(prompt: string, requestedModel: unknown): RealEsrganModel {
  const model = parseRequestedModel(requestedModel);
  if (model !== 'auto') {
    return model;
  }

  const tokens = tokenizeEnglish(prompt);
  const hasChineseAsset = hasAnySubstring(prompt, CHINESE_ASSET_TERMS);
  const hasEnglishAsset = hasAnyToken(tokens, ENGLISH_ASSET_TERMS);
  const hasSoftStylized = hasAnyToken(tokens, ENGLISH_SOFT_STYLIZED_TERMS)
    || hasAnySubstring(prompt, CHINESE_SOFT_STYLIZED_TERMS);
  const hasHardUpscale = hasAnyToken(tokens, ENGLISH_HARD_UPSCALE_TERMS)
    || hasAnySubstring(prompt, CHINESE_HARD_UPSCALE_TERMS);
  const hasGameAsset = tokens.includes('game') || tokens.includes('games')
    ? hasEnglishAsset || hasChineseAsset
    : false;

  if (hasSoftStylized) {
    return 'realesr-animevideov3';
  }
  if (hasHardUpscale && (hasEnglishAsset || hasChineseAsset || hasGameAsset)) {
    return 'realesrgan-x4plus-anime';
  }
  if (hasAnyToken(tokens, ENGLISH_STYLIZED_TERMS) || hasAnySubstring(prompt, CHINESE_STYLIZED_TERMS)) {
    return 'realesr-animevideov3';
  }
  if (hasAnyToken(tokens, ENGLISH_PHOTO_TERMS) || hasAnySubstring(prompt, CHINESE_PHOTO_TERMS)) {
    return 'realesrgan-x4plus';
  }
  return 'realesr-animevideov3';
}
