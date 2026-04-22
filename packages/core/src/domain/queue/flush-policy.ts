export class FlushPolicy {
  private readonly intervalMs: number;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private onFlush: (() => void) | null = null;

  constructor(intervalMs: number) {
    this.intervalMs = intervalMs;
  }

  start(onFlush: () => void): void {
    this.onFlush = onFlush;
    this.startTimer();
  }

  stop(): void {
    this.clearTimer();
    this.onFlush = null;
  }

  reset(): void {
    this.clearTimer();
    if (this.onFlush) {
      this.startTimer();
    }
  }

  private startTimer = (): void => {
    this.clearTimer();
    if (this.onFlush) {
      this.timerId = setInterval(this.onFlush, this.intervalMs);
    }
  };

  private clearTimer = (): void => {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  };
}
