import { describe, it, expect, vi } from 'vitest';
import { PageLifecycleManager } from './page-lifecycle.js';

describe('PageLifecycleManager', () => {
  it('registers visibilitychange listener', () => {
    const spy = vi.spyOn(document, 'addEventListener');
    const manager = new PageLifecycleManager(vi.fn());
    manager.register();
    expect(spy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    manager.unregister();
    spy.mockRestore();
  });

  it('unregisters listener', () => {
    const spy = vi.spyOn(document, 'removeEventListener');
    const manager = new PageLifecycleManager(vi.fn());
    manager.register();
    manager.unregister();
    expect(spy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    spy.mockRestore();
  });

  it('does not double-register', () => {
    const spy = vi.spyOn(document, 'addEventListener');
    const manager = new PageLifecycleManager(vi.fn());
    manager.register();
    manager.register();
    expect(spy).toHaveBeenCalledTimes(1);
    manager.unregister();
    spy.mockRestore();
  });
});
