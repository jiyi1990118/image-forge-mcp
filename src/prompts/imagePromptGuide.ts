export const imagePromptGuide = `# Pollinations Free-Tier Image Prompt Guide

## Core Rule
The free tier downsamples to 768px with limited inference steps.
SIMPLE prompts produce BETTER results. One main subject + one mood word is ideal.

## Do
- Keep prompt under 30 words
- Focus on ONE main subject
- Include ONE lighting/mood word (cinematic, soft light, golden hour)
- Include ONE quality word (8k, masterpiece)
- Use autoOptimize=true (default) to auto-compress long prompts

## Don't
- Don't list many subjects in one prompt
- Don't use redundant adjectives (very extremely beautifully...)
- Don't write long narrative descriptions
- Don't set enhance=true (makes prompts worse on free tier)

## Style-Specific Tips
- realistic: keep material/lighting words
- anime: keep character traits, simplify background
- painting: keep art style + subject only
- scifi: keep core tech words, remove narrative
- portrait: keep subject + atmosphere only

## Seed
Different seeds = different images. Same seed = same image (cached).
Use listImageModels to see available models.`;
