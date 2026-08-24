declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type DeepPartial<T> = T extends (...args: any[]) => any
    ? T
    : T extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;
}

export {};
