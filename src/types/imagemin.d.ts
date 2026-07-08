declare module 'imagemin' {
  interface ImageminOptions {
    destination?: string;
    plugins?: unknown[];
    glob?: boolean;
  }
  function imagemin(input: string[], options?: ImageminOptions): Promise<{ destinationPath: string }[]>;
  export default imagemin;
}

declare module 'imagemin-pngquant' {
  interface PngquantOptions {
    quality?: [number, number];
    speed?: number;
    strip?: boolean;
    dithering?: number | boolean;
  }
  const pngquant: (options?: PngquantOptions) => unknown;
  export default pngquant;
}

declare module 'imagemin-zopfli' {
  interface ZopfliOptions {
    more?: boolean;
    iterations?: number;
  }
  const zopfli: (options?: ZopfliOptions) => unknown;
  export default zopfli;
}
