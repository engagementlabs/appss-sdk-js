import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AppssConfig, AppssEvent, IEventQueue } from '@appss/sdk-core';
import { BrowserAppssClient } from './browser-client.js';

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

const setTelegram = (value: unknown): void => {
  (window as unknown as Record<string, unknown>)['Telegram'] = value;
};

const configWith = (queue: IEventQueue): AppssConfig => ({
  apiKey: 'test-key',
  queue,
  flushInterval: 60_000,
  batchSize: 1_000,
});

describe('BrowserAppssClient outside Telegram', () => {
  let queue: TestQueue;
  let client: BrowserAppssClient;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
    window.history.replaceState({}, '', '/checkout?utm_source=telegram');

    queue = new TestQueue();
    client = new BrowserAppssClient();
    client.init(configWith(queue));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('adds web session properties to every event', () => {
    client.trackEvent('page_viewed');

    const properties = queue.events[0]?.properties ?? {};
    expect(properties).toMatchObject({
      $current_url: window.location.href,
      $pathname: '/checkout',
      $referrer: '$direct',
      $referring_domain: '$direct',
      $device_type: 'Desktop',
      $browser_language: navigator.language,
      utm_source: 'telegram',
    });
    expect(properties['$screen_width']).toBe(window.screen.width);
    expect(properties['$viewport_width']).toBe(window.innerWidth);
    expect(properties['$timezone']).toBeTruthy();
  });

  it('keeps the campaign tags on events after the first one', () => {
    client.trackEvent('page_viewed');
    window.history.replaceState({}, '', '/checkout/success');
    client.trackEvent('purchase_completed');

    expect(queue.events[1]?.properties).toMatchObject({
      $pathname: '/checkout/success',
      utm_source: 'telegram',
    });
  });

  it('lets caller properties win over collected ones', () => {
    client.trackEvent('page_viewed', { $pathname: '/custom', plan: 'pro' });

    expect(queue.events[0]?.properties).toMatchObject({ $pathname: '/custom', plan: 'pro' });
  });

  it('sends a single $identify event carrying both IDs', () => {
    client.trackEvent('page_viewed');
    const anonymousId = queue.events[0]?.distinctId;

    client.identify('user-42');

    expect(queue.events[1]?.event).toBe('$identify');
    expect(queue.events[1]?.distinctId).toBe('user-42');
    expect(queue.events[1]?.properties).toMatchObject({ $anon_distinct_id: anonymousId });
  });

  it('does not repeat the link on the following events', () => {
    client.identify('user-42');
    client.trackEvent('logged_in');

    expect(queue.events[1]?.distinctId).toBe('user-42');
    expect(queue.events[1]?.properties?.['$anon_distinct_id']).toBeUndefined();
  });

  it('does not repeat $identify for the ID it already uses', () => {
    client.identify('user-42');
    client.identify('user-42');

    expect(queue.events.filter((event) => event.event === '$identify')).toHaveLength(1);
  });

  it('links the accounts when the app identifies another one', () => {
    client.identify('user-42');
    client.identify('user-7');

    expect(queue.events[1]?.event).toBe('$identify');
    expect(queue.events[1]?.distinctId).toBe('user-7');
    expect(queue.events[1]?.properties).toMatchObject({ $anon_distinct_id: 'user-42' });
  });

  it('links the new anonymous ID to the same account after re-login', () => {
    client.identify('user-42');
    const firstLink = queue.events[0]?.properties?.['$anon_distinct_id'];

    client.reset();
    client.identify('user-42');

    const secondLink = queue.events[1]?.properties?.['$anon_distinct_id'];
    expect(queue.events[1]?.event).toBe('$identify');
    expect(secondLink).toBeTruthy();
    expect(secondLink).not.toBe(firstLink);
  });

  it('separates the next user from the previous one after reset', () => {
    client.identify('user-42');
    client.reset();
    client.trackEvent('page_viewed');

    const afterReset = queue.events[1];
    expect(afterReset?.distinctId).not.toBe('user-42');

    client.identify('user-7');

    expect(queue.events[2]?.event).toBe('$identify');
    expect(queue.events[2]?.distinctId).toBe('user-7');
    expect(queue.events[2]?.properties).toMatchObject({
      $anon_distinct_id: afterReset?.distinctId,
    });
  });

  it('does not send $identify when the user opted out', () => {
    client.optOut();
    client.identify('user-42');

    expect(queue.events).toHaveLength(0);
    client.optIn();
  });
});

describe('BrowserAppssClient inside Telegram', () => {
  let queue: TestQueue;
  let client: BrowserAppssClient;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
    window.history.replaceState({}, '', '/?utm_source=telegram');
    setTelegram({
      WebApp: {
        platform: 'ios',
        version: '7.0',
        colorScheme: 'dark',
        initDataUnsafe: { user: { id: 42, first_name: 'John' } },
      },
    });

    queue = new TestQueue();
    client = new BrowserAppssClient();
    client.init(configWith(queue));
  });

  afterEach(() => {
    setTelegram(undefined);
    vi.unstubAllGlobals();
  });

  it('collects the same event properties as before', () => {
    client.trackEvent('page_viewed', { plan: 'pro' });

    expect(queue.events[0]?.distinctId).toBe('42');
    expect(queue.events[0]?.properties).toEqual({ plan: 'pro', $lib: 'browser' });
  });

  it('links the Telegram ID to the account on identify', () => {
    client.identify('user-42');

    expect(queue.events[0]?.event).toBe('$identify');
    expect(queue.events[0]?.distinctId).toBe('user-42');
    expect(queue.events[0]?.properties).toEqual({ $anon_distinct_id: '42', $lib: 'browser' });
  });

  it('keeps the account across launches and does not repeat the link', () => {
    client.identify('user-42');

    const relaunched = new BrowserAppssClient();
    relaunched.init(configWith(queue));
    relaunched.identify('user-42');
    relaunched.trackEvent('page_viewed');

    expect(queue.events.filter((event) => event.event === '$identify')).toHaveLength(1);
    expect(queue.events[1]?.distinctId).toBe('user-42');
  });

  it('returns to the Telegram ID on reset', () => {
    client.identify('user-42');
    client.reset();
    client.trackEvent('page_viewed');

    expect(queue.events[1]?.distinctId).toBe('42');
  });
});
