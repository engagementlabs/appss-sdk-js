export class PageLifecycleManager {
  private readonly onHidden: () => void;
  private registered = false;

  private readonly handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      this.onHidden();
    }
  };

  private readonly handlePageHide = (): void => {
    this.onHidden();
  };

  constructor(onHidden: () => void) {
    this.onHidden = onHidden;
  }

  register(): void {
    if (this.registered) return;
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('pagehide', this.handlePageHide);
    this.registered = true;
  }

  unregister(): void {
    if (!this.registered) return;
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('pagehide', this.handlePageHide);
    this.registered = false;
  }
}
