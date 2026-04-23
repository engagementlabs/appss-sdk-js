import { describe, it, expect, afterEach } from 'vitest';
import { extractTmaUser, extractTmaProperties } from './tma-context.js';

const setTelegram = (value: unknown): void => {
  (window as unknown as Record<string, unknown>)['Telegram'] = value;
};

describe('extractTmaUser', () => {
  afterEach(() => setTelegram(undefined));

  it('returns null when Telegram is not available', () => {
    expect(extractTmaUser()).toBeNull();
  });

  it('extracts user from TMA context', () => {
    setTelegram({
      WebApp: {
        initDataUnsafe: {
          user: { id: 42, first_name: 'John', username: 'johndoe', is_premium: true },
        },
      },
    });
    expect(extractTmaUser()).toEqual({
      id: 42,
      firstName: 'John',
      lastName: undefined,
      username: 'johndoe',
      languageCode: undefined,
      isPremium: true,
    });
  });

  it('returns null when user id is missing', () => {
    setTelegram({ WebApp: { initDataUnsafe: { user: { first_name: 'No Id' } } } });
    expect(extractTmaUser()).toBeNull();
  });
});

describe('extractTmaProperties', () => {
  afterEach(() => setTelegram(undefined));

  it('returns empty object when Telegram is not available', () => {
    expect(extractTmaProperties()).toEqual({});
  });

  it('extracts all available properties', () => {
    setTelegram({
      WebApp: {
        platform: 'ios',
        version: '7.2',
        colorScheme: 'dark',
        initDataUnsafe: {
          user: { id: 42, first_name: 'John', username: 'johndoe', language_code: 'en', is_premium: true },
          start_param: 'ref123',
        },
      },
    });
    const props = extractTmaProperties();
    expect(props['first_name']).toBe('John');
    expect(props['username']).toBe('johndoe');
    expect(props['language_code']).toBe('en');
    expect(props['is_premium']).toBe(true);
    expect(props['platform']).toBe('ios');
    expect(props['tg_webapp_version']).toBe('7.2');
    expect(props['color_scheme']).toBe('dark');
    expect(props['$start_param']).toBe('ref123');
  });

  it('skips missing fields', () => {
    setTelegram({ WebApp: { platform: 'android' } });
    const props = extractTmaProperties();
    expect(props['platform']).toBe('android');
    expect(props['first_name']).toBeUndefined();
    expect(props['$start_param']).toBeUndefined();
  });
});
