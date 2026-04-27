import { describe, it, expect } from 'vitest';
import { fromGrammyContext } from './grammy.js';

describe('fromGrammyContext', () => {
  it('extracts distinctId and properties', () => {
    const result = fromGrammyContext({
      from: { id: 123, username: 'johndoe' },
      chat: { type: 'private' },
      message: { text: '/start ref456', from: { id: 123 } },
    });
    expect(result?.distinctId).toBe('123');
    expect(result?.properties['username']).toBe('johndoe');
    expect(result?.properties['chat_type']).toBe('private');
    expect(result?.properties['$start_param']).toBe('ref456');
  });

  it('returns null for null input', () => {
    expect(fromGrammyContext(null)).toBeNull();
  });

  it('returns null for missing from', () => {
    expect(fromGrammyContext({})).toBeNull();
  });
});
