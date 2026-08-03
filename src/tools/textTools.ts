import { IMAGE_MODELS, TEXT_MODELS } from '../config/models.js';

export async function handleListImageModels(): Promise<{ content: Array<{ type: string; text: string }> }> {
  const available = IMAGE_MODELS.filter(m => m.status === 'available');
  const unavailable = IMAGE_MODELS.filter(m => m.status === 'unavailable');
  let text = `Available image models (${available.length}):\n`;
  available.forEach(m => { text += `  - ${m.name}: ${m.bestFor}\n`; });
  text += `\nUnavailable (free tier):\n`;
  unavailable.forEach(m => { text += `  - ${m.name}: ${m.bestFor}\n`; });
  return { content: [{ type: 'text', text }] };
}

export async function handleListTextModels(): Promise<{ content: Array<{ type: string; text: string }> }> {
  let text = `Available text models (${TEXT_MODELS.length}):\n`;
  TEXT_MODELS.forEach(m => {
    text += `  - ${m.name}: ${m.description}\n`;
    text += `    aliases: ${m.aliases.join(', ')}\n`;
    text += `    reasoning: ${m.reasoning}, tools: ${m.tools}\n`;
  });
  return { content: [{ type: 'text', text }] };
}