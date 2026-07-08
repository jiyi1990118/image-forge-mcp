export interface GenerateImageParams {
  prompt: string;
  model?: string;
  seed?: number;
  width?: number;
  height?: number;
  autoOptimize?: boolean;
  optimizeStyle?: string;
  enhance?: boolean;
  safe?: boolean;
  compress?: boolean;
  outputPath?: string;
  fileName?: string;
  format?: string;
}

export interface GenerateImageUrlParams {
  prompt: string;
  model?: string;
  seed?: number;
  width?: number;
  height?: number;
  autoOptimize?: boolean;
  optimizeStyle?: string;
  enhance?: boolean;
  safe?: boolean;
}

export interface RespondTextParams {
  prompt: string;
  system?: string;
  temperature?: number;
  top_p?: number;
  seed?: number;
}
