import { storageKey, uuid, type ILogger } from '@appss/sdk-core';

const ANONYMOUS_ID_KEY = storageKey('anonymous_id');

export function getOrCreateAnonymousId(logger?: ILogger | null): string {
  try {
    const stored = localStorage.getItem(ANONYMOUS_ID_KEY);
    if (stored) return stored;

    const id = uuid();
    localStorage.setItem(ANONYMOUS_ID_KEY, id);
    return id;
  } catch (error) {
    logger?.warn('Failed to persist the anonymous ID, falling back to a temporary one', {
      error: String(error),
    });
    return uuid();
  }
}

export function resetAnonymousId(logger?: ILogger | null): string {
  try {
    localStorage.removeItem(ANONYMOUS_ID_KEY);
  } catch (error) {
    logger?.warn('Failed to remove the stored anonymous ID', { error: String(error) });
  }

  return getOrCreateAnonymousId(logger);
}
