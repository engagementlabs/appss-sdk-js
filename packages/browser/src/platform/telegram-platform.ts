/// <reference types="../types/telegram-web-app" />
import type { Platform } from './platform.js';
import type { TmaUser } from '../types/tma.js';

export class TelegramPlatform implements Platform {
  readonly name = 'telegram';

  isAvailable(): boolean {
    return this.getUser() !== null;
  }

  getUserId(): string | null {
    const user = this.getUser();
    return user ? String(user.id) : null;
  }

  getProperties(): Record<string, unknown> {
    const properties: Record<string, unknown> = {};

    try {
      const webapp = window.Telegram?.WebApp;
      if (!webapp) return properties;

      const user = webapp.initDataUnsafe?.user;
      if (user) {
        if (user.first_name) properties['first_name'] = user.first_name;
        if (user.last_name) properties['last_name'] = user.last_name;
        if (user.username) properties['username'] = user.username;
        if (user.language_code) properties['language_code'] = user.language_code;
        if (user.is_premium !== undefined) properties['is_premium'] = user.is_premium;
        if (user.id !== undefined) properties['telegram_id'] = user.id;
      }

      if (webapp.platform) properties['platform'] = webapp.platform;
      if (webapp.version) properties['tg_webapp_version'] = webapp.version;
      if (webapp.colorScheme) properties['color_scheme'] = webapp.colorScheme;

      const startParam = webapp.initDataUnsafe?.start_param?.trim();
      if (startParam) properties['$start_param'] = startParam;
    } catch {
      /* noop */
    }

    return properties;
  }

  getEventContext(): Record<string, unknown> {
    return {};
  }

  private getUser(): TmaUser | null {
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
}
