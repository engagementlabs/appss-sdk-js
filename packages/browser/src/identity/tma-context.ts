/// <reference types="../types/telegram-web-app" />
import type { TmaUser } from '../types/tma.js';

export function extractTmaUser(): TmaUser | null {
  try {
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (!user || typeof user.id !== 'number') return null;

    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      languageCode: user.language_code,
      isPremium: user.is_premium,
    };
  } catch {
    return null;
  }
}

export function extractTmaProperties(): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  try {
    const webapp = window.Telegram?.WebApp;
    if (!webapp) return props;

    const user = webapp.initDataUnsafe?.user;
    if (user) {
      if (user.first_name) props['first_name'] = user.first_name;
      if (user.last_name) props['last_name'] = user.last_name;
      if (user.username) props['username'] = user.username;
      if (user.language_code) props['language_code'] = user.language_code;
      if (user.is_premium !== undefined) props['is_premium'] = user.is_premium;
      if (user.id !== undefined) props['telegram_id'] = user.id;
    }

    if (webapp.platform) props['platform'] = webapp.platform;
    if (webapp.version) props['tg_webapp_version'] = webapp.version;
    if (webapp.colorScheme) props['color_scheme'] = webapp.colorScheme;

    const startParam = webapp.initDataUnsafe?.start_param?.trim();
    if (startParam) props['$start_param'] = startParam;
  } catch {
    /* noop */
  }

  return props;
}
