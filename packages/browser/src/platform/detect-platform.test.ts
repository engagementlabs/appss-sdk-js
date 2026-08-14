import { describe, it, expect, afterEach } from 'vitest';
import { detectPlatform } from './detect-platform.js';

const setTelegram = (value: unknown): void => {
  (window as unknown as Record<string, unknown>)['Telegram'] = value;
};

describe('detectPlatform', () => {
  afterEach(() => setTelegram(undefined));

  it('falls back to the web platform on a plain page', () => {
    const platform = detectPlatform();

    expect(platform.name).toBe('web');
    expect(platform.getUserId()).toBeNull();
    expect(platform.getProperties()).toEqual({});
    expect(platform.getEventContext()).toMatchObject({ $current_url: window.location.href });
  });

  it('detects Telegram and exposes its user ID and properties', () => {
    setTelegram({
      WebApp: {
        platform: 'ios',
        initDataUnsafe: { user: { id: 42, first_name: 'John' } },
      },
    });

    const platform = detectPlatform();

    expect(platform.name).toBe('telegram');
    expect(platform.getUserId()).toBe('42');
    expect(platform.getProperties()).toEqual({
      first_name: 'John',
      telegram_id: 42,
      platform: 'ios',
    });
  });

  it('collects no event context inside Telegram', () => {
    setTelegram({ WebApp: { initDataUnsafe: { user: { id: 42 } } } });

    expect(detectPlatform().getEventContext()).toEqual({});
  });

  it('falls back to the web platform when Telegram has no user', () => {
    setTelegram({ WebApp: { platform: 'ios', initDataUnsafe: {} } });

    expect(detectPlatform().name).toBe('web');
  });
});
