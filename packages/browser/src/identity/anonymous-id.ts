import { storageKey } from '@appss/sdk-core';

const ANONYMOUS_ID_KEY = storageKey('anonymous_id');

export function getOrCreateAnonymousId(): string {
  try {
    const stored = localStorage.getItem(ANONYMOUS_ID_KEY);
    if (stored) return stored;

    const id = crypto.randomUUID();
    localStorage.setItem(ANONYMOUS_ID_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
