import { STORAGE_KEY_PREFIX } from './constants.js';

export function storageKey(name: string): string {
  return `${STORAGE_KEY_PREFIX}${name}`;
}
