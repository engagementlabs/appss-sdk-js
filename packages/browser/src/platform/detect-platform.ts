import type { Platform } from './platform.js';
import { TelegramPlatform } from './telegram-platform.js';
import { WebPlatform } from './web-platform.js';

const PLATFORMS: readonly Platform[] = [new TelegramPlatform(), new WebPlatform()];

export function detectPlatform(): Platform {
  return PLATFORMS.find((platform) => platform.isAvailable()) ?? new WebPlatform();
}
