export const SDK_PLATFORM = 'node' as const;

export const BOT_TOKEN_ENV = 'BOT_TOKEN' as const;
export const TELEGRAM_API_BASE = 'https://api.telegram.org' as const;
export const PUSH_SEND_MAX_RETRIES = 3;
export const PUSH_SEND_BACKOFF_MS = 1_000;
export const PUSH_SEND_MAX_BACKOFF_MS = 8_000;
export const PUSH_SEND_TIMEOUT_MS = 15_000;

export const PUSH_TRANSPORT_TELEGRAM = 'telegram' as const;
export const PUSH_SOURCE_SDK = 'sdk' as const;

export const RETRYABLE_SEND_REASONS: ReadonlySet<string> = new Set([
  'throttled',
  'network',
  'server_error',
]);
