import { DEFAULTS } from './constants.js';

export function getDefaults() {
  return {
    imageModel: DEFAULTS.IMAGE_MODEL,
    imageWidth: DEFAULTS.IMAGE_WIDTH,
    imageHeight: DEFAULTS.IMAGE_HEIGHT,
    textModel: DEFAULTS.TEXT_MODEL,
    outputDir: DEFAULTS.OUTPUT_DIR,
  };
}
