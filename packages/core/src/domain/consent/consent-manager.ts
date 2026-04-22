export class ConsentManager {
  private optedOut = false;

  optOut(): void {
    this.optedOut = true;
  }

  optIn(): void {
    this.optedOut = false;
  }

  isOptedOut(): boolean {
    return this.optedOut;
  }
}
