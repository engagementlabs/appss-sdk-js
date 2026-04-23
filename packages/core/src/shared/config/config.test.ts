import { describe, it, expect } from 'vitest';
import { validateConfig, validateRetryConfig, resolveConfig } from './config.js';
import { InvalidApiKeyError } from '../errors/index.js';

describe('validateConfig', () => {
  it('throws on empty apiKey', () => {
    expect(() => validateConfig({ apiKey: '' })).toThrow(InvalidApiKeyError);
    expect(() => validateConfig({ apiKey: '   ' })).toThrow(InvalidApiKeyError);
  });
  it('passes with valid apiKey', () => {
    expect(() => validateConfig({ apiKey: 'key' })).not.toThrow();
  });
  it('throws on invalid flushInterval', () => {
    expect(() => validateConfig({ apiKey: 'k', flushInterval: -1 })).toThrow(TypeError);
    expect(() => validateConfig({ apiKey: 'k', flushInterval: 0 })).toThrow(TypeError);
  });
  it('throws on invalid batchSize', () => {
    expect(() => validateConfig({ apiKey: 'k', batchSize: 1.5 })).toThrow(TypeError);
    expect(() => validateConfig({ apiKey: 'k', batchSize: 0 })).toThrow(TypeError);
  });
  it('throws on invalid requestTimeout', () => {
    expect(() => validateConfig({ apiKey: 'k', requestTimeout: -1 })).toThrow(TypeError);
  });
  it('delegates retry validation', () => {
    expect(() => validateConfig({ apiKey: 'k', retry: { maxRetries: -1 } })).toThrow(TypeError);
  });
  it('passes with valid retry config', () => {
    expect(() => validateConfig({ apiKey: 'k', retry: { maxRetries: 3, baseBackoffMs: 500 } })).not.toThrow();
  });
});

describe('validateRetryConfig', () => {
  it('passes empty object', () => {
    expect(() => validateRetryConfig({})).not.toThrow();
  });
  it('throws on negative maxRetries', () => {
    expect(() => validateRetryConfig({ maxRetries: -1 })).toThrow(TypeError);
  });
  it('throws on non-integer maxRetries', () => {
    expect(() => validateRetryConfig({ maxRetries: 1.5 })).toThrow(TypeError);
  });
  it('allows zero maxRetries (no retries)', () => {
    expect(() => validateRetryConfig({ maxRetries: 0 })).not.toThrow();
  });
  it('throws on non-positive baseBackoffMs', () => {
    expect(() => validateRetryConfig({ baseBackoffMs: 0 })).toThrow(TypeError);
    expect(() => validateRetryConfig({ baseBackoffMs: -100 })).toThrow(TypeError);
  });
  it('throws on non-positive maxBackoffMs', () => {
    expect(() => validateRetryConfig({ maxBackoffMs: 0 })).toThrow(TypeError);
  });
  it('passes valid config', () => {
    expect(() => validateRetryConfig({ maxRetries: 10, baseBackoffMs: 500, maxBackoffMs: 30000 })).not.toThrow();
  });
});

describe('resolveConfig', () => {
  it('merges defaults', () => {
    const r = resolveConfig({ apiKey: 'key' });
    expect(r.apiKey).toBe('key');
    expect(r.endpoint).toBe('http://157.90.231.51:5123');
    expect(r.batchSize).toBe(50);
    expect(r.debug).toBe(false);
    expect(r.retry).toEqual({ maxRetries: 5, baseBackoffMs: 1000, maxBackoffMs: 16000 });
  });
  it('respects overrides', () => {
    const r = resolveConfig({ apiKey: 'k', endpoint: 'https://x', batchSize: 100, debug: true });
    expect(r.endpoint).toBe('https://x');
    expect(r.batchSize).toBe(100);
    expect(r.debug).toBe(true);
  });
  it('respects partial retry overrides', () => {
    const r = resolveConfig({ apiKey: 'k', retry: { maxRetries: 10 } });
    expect(r.retry.maxRetries).toBe(10);
    expect(r.retry.baseBackoffMs).toBe(1000); // default
    expect(r.retry.maxBackoffMs).toBe(16000); // default
  });
  it('respects full retry overrides', () => {
    const r = resolveConfig({ apiKey: 'k', retry: { maxRetries: 0, baseBackoffMs: 500, maxBackoffMs: 5000 } });
    expect(r.retry).toEqual({ maxRetries: 0, baseBackoffMs: 500, maxBackoffMs: 5000 });
  });
});
