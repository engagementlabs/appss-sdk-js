const SHUTDOWN_TIMEOUT_MS = 5_000;

export class ShutdownHandler {
  private flushFn: (() => Promise<void>) | null = null;
  private registered = false;
  private shutdownInProgress = false;

  private readonly handleSignal = async (): Promise<void> => {
    if (this.shutdownInProgress) return;
    this.shutdownInProgress = true;

    const forceExit = setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    try {
      await this.flushFn?.();
    } catch { /* noop */ }

    process.exit(0);
  };

  register(flushFn: () => Promise<void>): void {
    if (this.registered) return;
    this.flushFn = flushFn;
    process.on('SIGTERM', this.handleSignal);
    process.on('SIGINT', this.handleSignal);
    this.registered = true;
  }

  unregister(): void {
    if (!this.registered) return;
    process.removeListener('SIGTERM', this.handleSignal);
    process.removeListener('SIGINT', this.handleSignal);
    this.flushFn = null;
    this.registered = false;
  }
}
