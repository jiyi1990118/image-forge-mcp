export const imagePromptGuide = `# Pollinations Free-Tier Image Prompt Guide

## Core Rule
The free tier downsamples to 768px with limited inference steps.
SIMPLE prompts produce BETTER results. One main subject + one mood word is ideal.

## PROMPT RULES (AGENT: follow these strictly)

### Good prompts (will work well)
- "a red apple on wood table" — one subject, simple composition
- "a cute cartoon cat" — one subject, one style
- "game icon sword" — asset keyword triggers auto-constraints
- "a glass of water on a table, soft lighting" — one subject, one mood

### Bad prompts (will fail)
- "a dragon fighting a knight in a castle with fireworks" — too many subjects
- "a busy street market with many people, stalls, animals" — too complex
- "a screenshot of a dashboard with text labels and buttons" — text won't render
- "a beautiful majestic lion with golden fur standing on a rock at sunset" — too many adjectives, auto-optimize will compress

## Scene-Specific Tips

### Developer/Workstation scenes
Use "blurred screens" and "abstract UI shapes". Never detailed code, many monitors, or text labels.

### Transparent assets / Icons
- Prompt "white background" then set removeBackground=true
- Do NOT ask the model for "transparent background"
- Include asset keywords (icon, asset, weapon, 道具, 图标) to trigger auto-constraints

### Style-Specific
- realistic: keep material/lighting words
- anime: keep character traits, simplify background
- painting: keep art style + subject only
- scifi: keep core tech words, remove narrative
- portrait: keep subject + atmosphere only

## What NOT to do
- Don't set enhance=true (makes prompts worse on free tier)
- Don't expect readable text, code, or logos
- Don't expect high resolution (768px max)
- Don't use complex multi-subject scenes

## Seed
Different seeds = different images. Same seed = same image (cached).
Use listImageModels to see available models.`;