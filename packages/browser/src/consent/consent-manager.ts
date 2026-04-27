import { storageKey } from '@appss/sdk-core';

const CONSENT_KEY = storageKey('consent_opted_out');

export class BrowserConsentManager {
  private optedOut: boolean;

  constructor() {
    this.optedOut = this.loadState();
  }

  optOut(): void {
    this.optedOut = true;
    this.saveState(true);
  }

  optIn(): void {
    this.optedOut = false;
    this.saveState(false);
  }

  isOptedOut(): boolean {
    return this.optedOut;
  }

  private loadState(): boolean {
    try {
      return localStorage.getItem(CONSENT_KEY) === '1';
    } catch {
      return false;
    }
  }

  private saveState(optedOut: boolean): void {
    try {
      if (optedOut) {
        localStorage.setItem(CONSENT_KEY, '1');
      } else {
        localStorage.removeItem(CONSENT_KEY);
      }
    } catch { /* noop */ }
  }
}
