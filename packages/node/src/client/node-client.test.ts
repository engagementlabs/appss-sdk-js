import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAppss, AppssNodeClient } from './node-client.js';

describe('AppssNodeClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ accepted: 1 }),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('createAppss returns client', () => {
    const client = createAppss({ apiKey: 'key' });
    expect(client).toBeInstanceOf(AppssNodeClient);
  });

  it('track sends events with distinctId', async () => {
    const client = createAppss({ apiKey: 'key' });
    client.track('user-1', 'purchase', { amount: 9.99 });
    await client.flush();

    const calls = vi.mocked(fetch).mock.calls;
    const eventCall = calls.find((c) => String(c[0]).includes('/api/v1/events'));
    expect(eventCall).toBeTruthy();
  });

  it('track with different users', async () => {
    const client = createAppss({ apiKey: 'key' });
    client.track('user-1', 'event_a');
    client.track('user-2', 'event_b');
    await client.flush();

    const calls = vi.mocked(fetch).mock.calls;
    const eventCall = calls.find((c) => String(c[0]).includes('/api/v1/events'));
    const body = JSON.parse(String((eventCall?.[1] as RequestInit)?.body)) as { batch: { distinct_id: string }[] };
    const ids = body.batch.map((e) => e.distinct_id);
    expect(ids).toContain('user-1');
    expect(ids).toContain('user-2');
  });

  it('setUserProperty sends to user-properties endpoint', async () => {
    const client = createAppss({ apiKey: 'key' });
    client.setUserProperty('user-1', 'plan', 'pro');
    await new Promise((r) => setTimeout(r, 10));

    const calls = vi.mocked(fetch).mock.calls;
    const propCall = calls.find((c) => String(c[0]).includes('/api/v1/user-properties'));
    expect(propCall).toBeTruthy();
  });

  it('destroy flushes', async () => {
    const client = createAppss({ apiKey: 'key' });
    client.track('user-1', 'final');
    await client.destroy();
    expect(fetch).toHaveBeenCalled();
  });
});
