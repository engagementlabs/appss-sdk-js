import { describe, it, expect } from 'vitest';
import { assertPositiveNumber, assertPositiveInteger, assertNonNegativeInteger } from './validation.js';

describe('assertPositiveNumber', () => {
  it('does nothing for undefined', () => {
    expect(() => assertPositiveNumber(undefined, 'field')).not.toThrow();
  });

  it('does nothing for valid positive numbers', () => {
    expect(() => assertPositiveNumber(1, 'field')).not.toThrow();
    expect(() => assertPositiveNumber(0.5, 'field')).not.toThrow();
    expect(() => assertPositiveNumber(100, 'field')).not.toThrow();
    expect(() => assertPositiveNumber(0.001, 'field')).not.toThrow();
  });

  it('throws for 0', () => {
    expect(() => assertPositiveNumber(0, 'field')).toThrow(TypeError);
  });

  it('throws for negative numbers', () => {
    expect(() => assertPositiveNumber(-1, 'field')).toThrow(TypeError);
    expect(() => assertPositiveNumber(-0.5, 'field')).toThrow(TypeError);
  });

  it('throws for NaN', () => {
    expect(() => assertPositiveNumber(NaN, 'field')).toThrow(TypeError);
  });

  it('throws for Infinity', () => {
    expect(() => assertPositiveNumber(Infinity, 'field')).toThrow(TypeError);
    expect(() => assertPositiveNumber(-Infinity, 'field')).toThrow(TypeError);
  });

  it('includes field name in error message', () => {
    expect(() => assertPositiveNumber(-1, 'flushInterval')).toThrow(
      'flushInterval must be a positive number.',
    );
  });
});

describe('assertPositiveInteger', () => {
  it('does nothing for undefined', () => {
    expect(() => assertPositiveInteger(undefined, 'field')).not.toThrow();
  });

  it('does nothing for valid positive integers', () => {
    expect(() => assertPositiveInteger(1, 'field')).not.toThrow();
    expect(() => assertPositiveInteger(2, 'field')).not.toThrow();
    expect(() => assertPositiveInteger(100, 'field')).not.toThrow();
  });

  it('throws for 0', () => {
    expect(() => assertPositiveInteger(0, 'field')).toThrow(TypeError);
  });

  it('throws for negative integers', () => {
    expect(() => assertPositiveInteger(-1, 'field')).toThrow(TypeError);
    expect(() => assertPositiveInteger(-100, 'field')).toThrow(TypeError);
  });

  it('throws for floats', () => {
    expect(() => assertPositiveInteger(1.5, 'field')).toThrow(TypeError);
    expect(() => assertPositiveInteger(0.5, 'field')).toThrow(TypeError);
  });

  it('throws for NaN', () => {
    expect(() => assertPositiveInteger(NaN, 'field')).toThrow(TypeError);
  });

  it('includes field name in error message', () => {
    expect(() => assertPositiveInteger(-1, 'batchSize')).toThrow(
      'batchSize must be a positive integer.',
    );
  });
});

describe('assertNonNegativeInteger', () => {
  it('does nothing for undefined', () => {
    expect(() => assertNonNegativeInteger(undefined, 'field')).not.toThrow();
  });

  it('does nothing for 0', () => {
    expect(() => assertNonNegativeInteger(0, 'field')).not.toThrow();
  });

  it('does nothing for positive integers', () => {
    expect(() => assertNonNegativeInteger(1, 'field')).not.toThrow();
    expect(() => assertNonNegativeInteger(100, 'field')).not.toThrow();
  });

  it('throws for negative integers', () => {
    expect(() => assertNonNegativeInteger(-1, 'field')).toThrow(TypeError);
    expect(() => assertNonNegativeInteger(-100, 'field')).toThrow(TypeError);
  });

  it('throws for floats', () => {
    expect(() => assertNonNegativeInteger(1.5, 'field')).toThrow(TypeError);
    expect(() => assertNonNegativeInteger(0.5, 'field')).toThrow(TypeError);
  });

  it('throws for NaN', () => {
    expect(() => assertNonNegativeInteger(NaN, 'field')).toThrow(TypeError);
  });

  it('includes field name in error message', () => {
    expect(() => assertNonNegativeInteger(-1, 'maxRetries')).toThrow(
      'maxRetries must be a non-negative integer.',
    );
  });
});
