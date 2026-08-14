import { describe, it, expect, afterEach, vi } from 'vitest';
import { uuid } from './uuid.js';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const setCrypto = (value: unknown): void => {
  vi.stubGlobal('crypto', value);
};

describe('uuid', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the native generator when available', () => {
    expect(uuid()).toMatch(UUID_V4);
  });

  it('falls back to random bytes on insecure origins', () => {
    const getRandomValues = vi.fn((array: Uint8Array) => {
      array.fill(7);
      return array;
    });
    setCrypto({ getRandomValues });

    const id = uuid();

    expect(id).toMatch(UUID_V4);
    expect(getRandomValues).toHaveBeenCalled();
  });

  it('falls back to Math.random when there is no crypto at all', () => {
    setCrypto(undefined);

    expect(uuid()).toMatch(UUID_V4);
  });

  it('falls back when the native generator throws', () => {
    setCrypto({
      randomUUID: () => {
        throw new Error('not allowed');
      },
    });

    expect(uuid()).toMatch(UUID_V4);
  });

  it('does not repeat itself', () => {
    setCrypto(undefined);

    const ids = new Set(Array.from({ length: 1000 }, () => uuid()));

    expect(ids.size).toBe(1000);
  });
});
