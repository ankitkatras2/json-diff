declare module 'json-diff' {
    export function diffString(
      obj1: object,
      obj2: object,
      options?: { color?: boolean }
    ): string | null;
  }