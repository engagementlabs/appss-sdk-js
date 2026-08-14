interface RandomSource {
  randomUUID?: () => string;
  getRandomValues?: (array: Uint8Array) => Uint8Array;
}

function getRandomSource(): RandomSource | undefined {
  return (globalThis as { crypto?: RandomSource }).crypto;
}

function randomBytes(source: RandomSource | undefined): number[] {
  const bytes = new Uint8Array(16);

  if (typeof source?.getRandomValues === 'function') {
    source.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  const values = Array.from(bytes);
  values[6] = ((values[6] ?? 0) & 0x0f) | 0x40;
  values[8] = ((values[8] ?? 0) & 0x3f) | 0x80;
  return values;
}

function format(values: number[]): string {
  const hex = values.map((value) => value.toString(16).padStart(2, '0'));

  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}

export function uuid(): string {
  const source = getRandomSource();

  if (typeof source?.randomUUID === 'function') {
    try {
      return source.randomUUID();
    } catch {
      /* noop */
    }
  }

  return format(randomBytes(source));
}
