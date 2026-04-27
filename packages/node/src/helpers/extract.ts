export interface TelegramUserProperties {
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  is_premium?: boolean;
  chat_type?: string;
  $start_param?: string;
}

export interface ExtractedContext {
  distinctId: string;
  properties: TelegramUserProperties;
}

export function extractFrom(ctx: Record<string, unknown>): Record<string, unknown> | null {
  if (typeof ctx['from'] === 'object' && ctx['from'] !== null) {
    const from = ctx['from'] as Record<string, unknown>;
    if (typeof from['id'] === 'number') return from;
  }

  const message = ctx['message'] as Record<string, unknown> | undefined;
  if (message && typeof message['from'] === 'object' && message['from'] !== null) {
    const from = message['from'] as Record<string, unknown>;
    if (typeof from['id'] === 'number') return from;
  }

  return null;
}

export function buildProperties(from: Record<string, unknown>, ctx: Record<string, unknown>): TelegramUserProperties {
  const props: TelegramUserProperties = {};

  if (typeof from['username'] === 'string') props['username'] = from['username'];
  if (typeof from['first_name'] === 'string') props['first_name'] = from['first_name'];
  if (typeof from['last_name'] === 'string') props['last_name'] = from['last_name'];
  if (typeof from['language_code'] === 'string') props['language_code'] = from['language_code'];
  if (typeof from['is_premium'] === 'boolean') props['is_premium'] = from['is_premium'];

  const chat = ctx['chat'] as Record<string, unknown> | undefined;
  if (chat && typeof chat['type'] === 'string') props['chat_type'] = chat['type'];

  return props;
}

export function extractStartParam(ctx: Record<string, unknown>): string | null {
  const message = ctx['message'] as Record<string, unknown> | undefined;
  if (!message) return null;

  const text = message['text'];
  if (typeof text !== 'string') return null;

  if (text.startsWith('/start ')) {
    return text.slice(7).trim() || null;
  }

  return null;
}
