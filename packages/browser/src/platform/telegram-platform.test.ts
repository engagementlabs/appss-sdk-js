import { describe, it, expect, afterEach } from 'vitest';
import { TelegramPlatform } from './telegram-platform.js';

const setTelegram = (value: unknown): void => {
  (window as unknown as Record<string, unknown>)['Telegram'] = value;
};

describe('TelegramPlatform', () => {
  afterEach(() => setTelegram(undefined));

  it('is not available outside Telegram', () => {
    const platform = new TelegramPlatform();

    expect(platform.isAvailable()).toBe(false);
    expect(platform.getUserId()).toBeNull();
    expect(platform.getProperties()).toEqual({});
  });

  it('is not available when the user ID is missing', () => {
    setTelegram({ WebApp: { initDataUnsafe: { user: { first_name: 'No Id' } } } });

    expect(new TelegramPlatform().isAvailable()).toBe(false);
  });

  it('reports the Telegram user ID as a string', () => {
    setTelegram({ WebApp: { initDataUnsafe: { user: { id: 42, first_name: 'John' } } } });

    const platform = new TelegramPlatform();

    expect(platform.isAvailable()).toBe(true);
    expect(platform.getUserId()).toBe('42');
  });

  it('extracts all available properties', () => {
    setTelegram({
      WebApp: {
        platform: 'ios',
        version: '7.2',
        colorScheme: 'dark',
        initDataUnsafe: {
          user: {
            id: 42,
            first_name: 'John',
            username: 'johndoe',
            language_code: 'en',
            is_premium: true,
          },
          start_param: 'ref123',
        },
      },
    });

    expect(new TelegramPlatform().getProperties()).toEqual({
      first_name: 'John',
      username: 'johndoe',
      language_code: 'en',
      is_premium: true,
      telegram_id: 42,
      platform: 'ios',
      tg_webapp_version: '7.2',
      color_scheme: 'dark',
      $start_param: 'ref123',
    });
  });

  it('skips missing fields', () => {
    setTelegram({ WebApp: { platform: 'android' } });

    expect(new TelegramPlatform().getProperties()).toEqual({ platform: 'android' });
  });

  it('collects no event context', () => {
    setTelegram({ WebApp: { initDataUnsafe: { user: { id: 42 } } } });

    expect(new TelegramPlatform().getEventContext()).toEqual({});
  });
});
