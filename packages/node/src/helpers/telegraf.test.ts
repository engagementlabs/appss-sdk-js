import { describe, it, expect } from 'vitest';
import { fromTelegrafContext } from './telegraf.js';

const makeCtx = (overrides?: Record<string, unknown>) => ({
  from: { id: 123, username: 'johndoe', first_name: 'John', last_name: 'Doe', language_code: 'en', is_premium: true },
  chat: { type: 'private' },
  message: { text: '/start ref123', from: { id: 123, username: 'johndoe', first_name: 'John' } },
  ...overrides,
});

describe('fromTelegrafContext', () => {
  it('extracts distinctId and properties', () => {
    const result = fromTelegrafContext(makeCtx());
    expect(result?.distinctId).toBe('123');
    expect(result?.properties['username']).toBe('johndoe');
    expect(result?.properties['first_name']).toBe('John');
    expect(result?.properties['last_name']).toBe('Doe');
    expect(result?.properties['language_code']).toBe('en');
    expect(result?.properties['is_premium']).toBe(true);
    expect(result?.properties['chat_type']).toBe('private');
    expect(result?.properties['$start_param']).toBe('ref123');
  });

  it('returns null for missing from', () => {
    expect(fromTelegrafContext({})).toBeNull();
  });

  it('falls back to message.from', () => {
    const result = fromTelegrafContext({ message: { from: { id: 456 }, text: 'hello' } });
    expect(result?.distinctId).toBe('456');
  });

  it('handles missing start param', () => {
    const ctx = makeCtx({ message: { text: 'hello', from: { id: 123 } } });
    expect(fromTelegrafContext(ctx)?.properties['$start_param']).toBeUndefined();
  });
});
