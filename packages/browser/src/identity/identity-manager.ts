import { storageKey, type ILogger } from '@appss/sdk-core';

import { getOrCreateAnonymousId, resetAnonymousId } from './anonymous-id.js';

const DISTINCT_ID_KEY = storageKey('distinct_id');

export class BrowserIdentityManager {
  private distinctId: string | null = null;

  start(platformId: string | null, logger?: ILogger | null): void {
    this.distinctId = this.loadDistinctId(logger) ?? platformId ?? getOrCreateAnonymousId(logger);
  }

  reset(platformId: string | null, logger?: ILogger | null): void {
    this.clearDistinctId(logger);
    this.distinctId = platformId ?? resetAnonymousId(logger);
  }

  identify(distinctId: string, logger?: ILogger | null): string | null {
    const previousId = this.distinctId;
    if (previousId === distinctId) return null;

    this.distinctId = distinctId;
    this.saveDistinctId(distinctId, logger);

    return previousId;
  }

  getDistinctId(): string | null {
    return this.distinctId;
  }

  private loadDistinctId(logger?: ILogger | null): string | null {
    try {
      return localStorage.getItem(DISTINCT_ID_KEY);
    } catch (error) {
      logger?.warn('Failed to read the stored account ID', { error: String(error) });
      return null;
    }
  }

  private saveDistinctId(distinctId: string, logger?: ILogger | null): void {
    try {
      localStorage.setItem(DISTINCT_ID_KEY, distinctId);
    } catch (error) {
      logger?.warn('Failed to store the account ID', { error: String(error) });
    }
  }

  private clearDistinctId(logger?: ILogger | null): void {
    try {
      localStorage.removeItem(DISTINCT_ID_KEY);
    } catch (error) {
      logger?.warn('Failed to remove the stored account ID', { error: String(error) });
    }
  }
}
