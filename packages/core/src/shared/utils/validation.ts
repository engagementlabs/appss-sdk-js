export function assertPositiveNumber(value: number | undefined, name: string): void {
  if (value !== undefined && (value <= 0 || !Number.isFinite(value))) {
    throw new TypeError(`${name} must be a positive number.`);
  }
}

export function assertPositiveInteger(value: number | undefined, name: string): void {
  if (value !== undefined && (!Number.isInteger(value) || value <= 0)) {
    throw new TypeError(`${name} must be a positive integer.`);
  }
}

export function assertNonNegativeInteger(value: number | undefined, name: string): void {
  if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
    throw new TypeError(`${name} must be a non-negative integer.`);
  }
}
