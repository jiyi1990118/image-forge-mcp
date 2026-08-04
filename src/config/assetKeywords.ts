import { DEFAULTS } from './constants.js';

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

export function shouldUseAssetPipeline(prompt: string): boolean {
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

export function addNoTextConstraint(prompt: string): string {
  return `${prompt}, ${NO_TEXT_PROMPT}`;
}

export function addAssetConstraint(prompt: string): string {
  if (!shouldUseAssetPipeline(prompt)) return prompt;

  const promptLower = prompt.toLowerCase();
  const hasBackgroundColor = BACKGROUND_COLOR_TERMS.some((term) => promptLower.includes(term));

  const constraints = [hasBackgroundColor ? ASSET_PROMPT_WITHOUT_BG : ASSET_PROMPT];
  if (isWeaponAssetPrompt(prompt)) constraints.push(WEAPON_PROMPT);
  if (isBladedWeaponPrompt(prompt)) constraints.push(BLADED_WEAPON_PROMPT);
  if (isOrganicAssetPrompt(prompt)) constraints.push(ORGANIC_PROMPT);
  return `${prompt}, ${constraints.join(' ')}`;
}

export function selectImageModel(prompt: string, explicitModel: unknown): string {
  if (explicitModel) return String(explicitModel);
  return shouldUseQwenImage(prompt) ? 'qwen-image' : DEFAULTS.IMAGE_MODEL;
}

export function shouldApplyNoTextConstraint(value: unknown): boolean {
  return value !== false;
}
