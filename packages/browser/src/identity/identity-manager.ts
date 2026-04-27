import { extractTmaUser, extractTmaProperties } from './tma-context.js';
import { getOrCreateAnonymousId } from './anonymous-id.js';

export class BrowserIdentityManager {
  private distinctId: string | null = null;

  autoIdentify(): Record<string, unknown> | null {
    const tmaUser = extractTmaUser();

    if (tmaUser) {
      this.distinctId = String(tmaUser.id);
      return extractTmaProperties();
    }

    this.distinctId = getOrCreateAnonymousId();
    return null;
  }

  identify(distinctId: string): void {
    this.distinctId = distinctId;
  }

  getDistinctId(): string | null {
    return this.distinctId;
  }
}
