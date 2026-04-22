export class IdentityManager {
  private distinctId: string | null = null;
  private pendingProperties: Record<string, unknown> = {};
  private hasPending = false;

  identify(distinctId: string): void {
    if (this.distinctId !== null && this.distinctId !== distinctId) {
      this.pendingProperties = {};
      this.hasPending = false;
    }

    this.distinctId = distinctId;
  }

  getDistinctId(): string | null {
    return this.distinctId;
  }

  isIdentified(): boolean {
    return this.distinctId !== null;
  }

  setUserProperty(key: string, value: unknown): void {
    if (!key || key.trim().length === 0) {
      throw new Error('User property key cannot be empty.');
    }
    this.pendingProperties[key] = value;
    this.hasPending = true;
  }

  hasPendingProperties(): boolean {
    return this.hasPending;
  }

  peekPendingProperties(): Record<string, unknown> | undefined {
    if (!this.hasPending) {
      return undefined;
    }
    return { ...this.pendingProperties };
  }

  clearPendingProperties(): void {
    this.pendingProperties = {};
    this.hasPending = false;
  }

  reset(): void {
    this.distinctId = null;
    this.pendingProperties = {};
    this.hasPending = false;
  }
}
