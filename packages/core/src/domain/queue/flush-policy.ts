export class FlushPolicy {
  private readonly intervalMs: number;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private flushFn: (() => Promise<void>) | null = null;
  private flushPromise: Promise<void> | null = null;

  constructor(intervalMs: number) {
    this.intervalMs = intervalMs;
  }

  start(flushFn: () => Promise<void>): void {
    this.flushFn = flushFn;
    this.startTimer();
  }

  stop(): void {
    this.clearTimer();
    this.flushFn = null;
    this.flushPromise = null;
  }

  reset(): void {
    this.clearTimer();
    if (this.flushFn) {
      this.startTimer();
    }
  }

  async flush(): Promise<void> {
    if (!this.flushFn) return;

    if (this.flushPromise) {
      return this.flushPromise;
    }

    this.flushPromise = this.flushFn();
    try {
      await this.flushPromise;
    } finally {
      this.flushPromise = null;
    }
  }

  private startTimer = (): void => {
    this.clearTimer();
    if (this.flushFn) {
      this.timerId = setInterval(() => void this.flush(), this.intervalMs);
    }
  };

  private clearTimer = (): void => {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  };
}
