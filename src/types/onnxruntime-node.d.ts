declare module 'onnxruntime-node' {
  export type TensorDataType = 'float32' | 'float64' | 'int8' | 'int16' | 'int32' | 'uint8' | 'uint16' | 'uint32' | 'bool';

  export interface OnnxTensor {
    type: string;
    data: Float32Array | Float64Array | Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array | Uint8ClampedArray | BigInt64Array | BigUint64Array;
    dims: readonly number[];
    size: number;
  }

  export class Tensor {
    constructor(type: TensorDataType, data: ArrayLike<number> | Buffer, dims: readonly number[]);
    readonly type: string;
    readonly data: unknown;
    readonly dims: readonly number[];
    readonly size: number;
  }

  export interface InferenceSession {
    readonly inputNames: readonly string[];
    readonly outputNames: readonly string[];
    run(feeds: Record<string, Tensor>): Promise<Record<string, OnnxTensor>>;
  }

  export namespace InferenceSession {
    function create(modelPath: string | Buffer, options?: Record<string, unknown>): Promise<InferenceSession>;
  }
}
