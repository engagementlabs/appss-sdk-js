import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AppssEvent, IEventQueue } from '@appss/sdk-core';
import { init, track, setSuperProperties, resetSuperProperties, reset } from './singleton.js';

class TestQueue implements IEventQueue {
  readonly events: AppssEvent[] = [];
  enqueue(event: AppssEvent): void {
    this.events.push(event);
  }
  drain(n: number): AppssEvent[] {
    return this.events.splice(0, n);
  }
  peek(n: number): AppssEvent[] {
    return this.events.slice(0, n);
  }
  size(): number {
    return this.events.length;
  }
  isEmpty(): boolean {
    return this.events.length === 0;
  }
  clear(): void {
    this.events.length = 0;
  }
}

describe('super properties through the public API', () => {
  let queue: TestQueue;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));

    queue = new TestQueue();
    init({ apiKey: 'test-key', queue, flushInterval: 60_000, batchSize: 1_000 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('attaches the properties to every event that follows', () => {
    track('before');
    setSuperProperties({ app_version: '1.2.3', tenant: 'acme' });
    track('after_first');
    track('after_second');

    expect(queue.events[0]?.properties?.['app_version']).toBeUndefined();
    expect(queue.events[1]?.properties).toMatchObject({ app_version: '1.2.3', tenant: 'acme' });
    expect(queue.events[2]?.properties).toMatchObject({ app_version: '1.2.3', tenant: 'acme' });
  });

  it('accumulates across calls', () => {
    setSuperProperties({ app_version: '1.2.3' });
    setSuperProperties({ tenant: 'acme' });
    track('page_viewed');

    expect(queue.events[0]?.properties).toMatchObject({ app_version: '1.2.3', tenant: 'acme' });
  });

  it('lets the properties of the call win', () => {
    setSuperProperties({ plan: 'free' });
    track('upgraded', { plan: 'pro' });

    expect(queue.events[0]?.properties?.['plan']).toBe('pro');
  });

  it('does not override the collected web context', () => {
    setSuperProperties({ $pathname: '/super' });
    track('page_viewed');

    expect(queue.events[0]?.properties?.['$pathname']).toBe(window.location.pathname);
  });

  it('resetSuperProperties() clears them and keeps $lib', () => {
    setSuperProperties({ app_version: '1.2.3' });
    resetSuperProperties();
    track('page_viewed');

    expect(queue.events[0]?.properties?.['app_version']).toBeUndefined();
    expect(queue.events[0]?.properties?.['$lib']).toBe('browser');
  });

  it('reset() clears them together with the identity', () => {
    setSuperProperties({ app_version: '1.2.3' });
    reset();
    track('page_viewed');

    expect(queue.events[0]?.properties?.['app_version']).toBeUndefined();
    expect(queue.events[0]?.properties?.['$lib']).toBe('browser');
  });

  it('survives a re-init only if set again', () => {
    setSuperProperties({ app_version: '1.2.3' });

    const nextQueue = new TestQueue();
    init({ apiKey: 'test-key', queue: nextQueue, flushInterval: 60_000, batchSize: 1_000 });
    track('page_viewed');

    expect(nextQueue.events[0]?.properties?.['app_version']).toBeUndefined();
  });
});

describe('super properties before init', () => {
  it('throw the not-initialized error', async () => {
    const { destroy } = await import('./singleton.js');
    await destroy();

    expect(() => setSuperProperties({ app_version: '1.2.3' })).toThrow(/not initialized/i);
    expect(() => resetSuperProperties()).toThrow(/not initialized/i);
  });
});
