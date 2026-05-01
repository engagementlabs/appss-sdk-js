import { describe, it, expect, beforeEach } from 'vitest';
import { AbstractAppssClient } from './abstract-client.js';
import { PURCHASE_EVENT } from '../../shared/constants.js';
import type { ITransport } from '../../ports/transport.js';
import type { ILogger } from '../../ports/logger.js';
import type { IEventQueue } from '../../ports/queue.js';
import type { AppssConfig, ResolvedConfig } from '../../shared/types/config.js';
import type { AppssEvent, TransportResponse } from '../../shared/types/wire-protocol.js';

class NoopLogger implements ILogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

class TestTransport implements ITransport {
  readonly calls: { path: string; body: unknown }[] = [];
  response: TransportResponse = { statusCode: 200, headers: {}, body: { accepted: 1 } };

  async send(path: string, body: unknown): Promise<TransportResponse> {
    this.calls.push({ path, body });
    return this.response;
  }
}

class TestQueue implements IEventQueue {
  private events: AppssEvent[] = [];
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
    this.events = [];
  }
}

class TestClient extends AbstractAppssClient {
  transport_ = new TestTransport();
  lifecycleRegistered = false;

  override init(config: AppssConfig): void {
    super.init(config);
    this.setSuperProperties({ $lib: 'test' });
  }

  protected createTransport(_config: ResolvedConfig): ITransport {
    return this.transport_;
  }
  protected createQueue(_config: ResolvedConfig): IEventQueue {
    return new TestQueue();
  }
  protected createLogger(_config: ResolvedConfig): ILogger {
    return new NoopLogger();
  }
  protected registerLifecycleHandlers(): void {
    this.lifecycleRegistered = true;
  }
  protected unregisterLifecycleHandlers(): void {
    this.lifecycleRegistered = false;
  }
}

describe('AbstractAppssClient', () => {
  let client: TestClient;
  beforeEach(() => {
    client = new TestClient();
  });

  describe('init', () => {
    it('configures SDK', () => {
      client.init({ apiKey: 'key' });
      expect(client.lifecycleRegistered).toBe(true);
    });
    it('throws on invalid apiKey', () => {
      expect(() => client.init({ apiKey: '' })).toThrow();
    });
    it('idempotent', () => {
      client.init({ apiKey: 'key' });
      client.init({ apiKey: 'key2' });
      expect(client.lifecycleRegistered).toBe(true);
    });
  });

  describe('track', () => {
    it('sends events with distinctId to /api/v1/events', async () => {
      client.init({ apiKey: 'key' });
      client.track('user-1', 'purchase', { amount: 9.99 });
      await client.flush();
      const eventCalls = client.transport_.calls.filter((c) => c.path === '/api/v1/events');
      expect(eventCalls.length).toBeGreaterThan(0);
      const batch = (eventCalls[0]?.body as { batch: { distinct_id: string }[] }).batch;
      expect(batch[0]?.distinct_id).toBe('user-1');
    });
    it('auto-flushes on threshold', async () => {
      client.init({ apiKey: 'key', batchSize: 2 });
      client.track('user-1', 'a');
      client.track('user-1', 'b');

      await new Promise((r) => setTimeout(r, 10));
      const eventCalls = client.transport_.calls.filter((c) => c.path === '/api/v1/events');
      expect(eventCalls.length).toBeGreaterThan(0);
    });
    it('skips empty distinctId', () => {
      client.init({ apiKey: 'key' });
      client.track('', 'event');
      expect(client.transport_.calls).toHaveLength(0);
    });
    it('does not crash before init', () => {
      client.track('user-1', 'x');
    });
    it('injects $lib into event properties', async () => {
      client.init({ apiKey: 'key' });
      client.track('user-1', 'test_event', { foo: 'bar' });
      await client.flush();
      const eventCalls = client.transport_.calls.filter((c) => c.path === '/api/v1/events');
      const body = eventCalls[0]!.body as { batch: Array<{ properties: Record<string, unknown> }> };
      expect(body.batch[0]!.properties).toHaveProperty('$lib', 'test');
      expect(body.batch[0]!.properties).toHaveProperty('foo', 'bar');
    });
    it('accepts numeric distinctId', async () => {
      client.init({ apiKey: 'key' });
      client.track(12345, 'event');
      await client.flush();
      const eventCalls = client.transport_.calls.filter((c) => c.path === '/api/v1/events');
      const batch = (eventCalls[0]!.body as { batch: { distinct_id: string }[] }).batch;
      expect(batch[0]!.distinct_id).toBe('12345');
    });
    it('skips NaN distinctId', () => {
      client.init({ apiKey: 'key' });
      client.track(NaN, 'event');
      expect(client.transport_.calls).toHaveLength(0);
    });
  });

  describe('track $purchase validation', () => {
    it('sends $purchase with valid properties', async () => {
      client.init({ apiKey: 'key' });
      client.track('user-1', PURCHASE_EVENT, { currency: 'USD', amount: 9.99 });
      await client.flush();
      const eventCalls = client.transport_.calls.filter((c) => c.path === '/api/v1/events');
      expect(eventCalls.length).toBeGreaterThan(0);
    });
    it('throws when $purchase has missing currency', () => {
      client.init({ apiKey: 'key' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => client.track('user-1', PURCHASE_EVENT, { amount: 10 } as any)).toThrow(TypeError);
    });
    it('throws when $purchase has invalid amount', () => {
      client.init({ apiKey: 'key' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => client.track('user-1', PURCHASE_EVENT, { currency: 'USD', amount: 'ten' } as any)).toThrow(TypeError);
    });
    it('throws when $purchase has NaN amount', () => {
      client.init({ apiKey: 'key' });
      expect(() => client.track('user-1', PURCHASE_EVENT, { currency: 'USD', amount: NaN })).toThrow(TypeError);
    });
    it('allows $purchase with zero amount', () => {
      client.init({ apiKey: 'key' });
      expect(() => client.track('user-1', PURCHASE_EVENT, { currency: 'USD', amount: 0 })).not.toThrow();
    });
    it('allows $purchase with negative amount (refund)', () => {
      client.init({ apiKey: 'key' });
      expect(() => client.track('user-1', PURCHASE_EVENT, { currency: 'USD', amount: -5.00 })).not.toThrow();
    });
    it('allows $purchase with extra properties', async () => {
      client.init({ apiKey: 'key' });
      client.track('user-1', PURCHASE_EVENT, { currency: 'EUR', amount: 100, product: 'Premium', custom: true });
      await client.flush();
      const eventCalls = client.transport_.calls.filter((c) => c.path === '/api/v1/events');
      expect(eventCalls.length).toBeGreaterThan(0);
    });
  });

  describe('superProperties', () => {
    it('setSuperProperties attaches to all events', async () => {
      client.init({ apiKey: 'key' });
      client.setSuperProperties({ env: 'test', version: '1.0' });
      client.track('user-1', 'event_a');
      await client.flush();
      const eventCalls = client.transport_.calls.filter((c) => c.path === '/api/v1/events');
      const props = (eventCalls[0]!.body as { batch: Array<{ properties: Record<string, unknown> }> }).batch[0]!.properties;
      expect(props).toHaveProperty('env', 'test');
      expect(props).toHaveProperty('version', '1.0');
    });
    it('resetSuperProperties clears custom properties', async () => {
      client.init({ apiKey: 'key' });
      client.setSuperProperties({ env: 'test' });
      client.resetSuperProperties();
      client.setSuperProperties({ $lib: 'test' });
      client.track('user-1', 'event_a');
      await client.flush();
      const eventCalls = client.transport_.calls.filter((c) => c.path === '/api/v1/events');
      const props = (eventCalls[0]!.body as { batch: Array<{ properties: Record<string, unknown> }> }).batch[0]!.properties;
      expect(props).not.toHaveProperty('env');
      expect(props).toHaveProperty('$lib', 'test');
    });
  });

  describe('setUserProperty', () => {
    it('sends to /api/v1/user-properties', async () => {
      client.init({ apiKey: 'key' });
      client.setUserProperty('user-1', 'plan', 'pro');
      await new Promise((r) => setTimeout(r, 10));
      const propCalls = client.transport_.calls.filter((c) => c.path === '/api/v1/user-properties');
      expect(propCalls).toHaveLength(1);
    });
    it('setUserProperties sends all in one request', async () => {
      client.init({ apiKey: 'key' });
      client.setUserProperties('user-1', { a: 1, b: 2 });
      await new Promise((r) => setTimeout(r, 10));
      const propCalls = client.transport_.calls.filter((c) => c.path === '/api/v1/user-properties');
      expect(propCalls).toHaveLength(1);
      const body = propCalls[0]?.body as {
        distinct_id: string;
        properties: Record<string, unknown>;
      };
      expect(body.distinct_id).toBe('user-1');
      expect(body.properties['a']).toBe(1);
    });
  });

  describe('flush', () => {
    it('noop before init', async () => {
      await client.flush();
      expect(client.transport_.calls).toHaveLength(0);
    });
  });

  describe('destroy', () => {
    it('flushes and cleans up', async () => {
      client.init({ apiKey: 'key' });
      client.track('user-1', 'final');
      await client.destroy();
      expect(client.lifecycleRegistered).toBe(false);
      expect(client.transport_.calls.length).toBeGreaterThan(0);
    });
    it('noop before init', async () => {
      await client.destroy();
    });
  });

  describe('401 stops sends', () => {
    it('stops future flushes', async () => {
      client.transport_.response = { statusCode: 401, headers: {} };
      client.init({ apiKey: 'key' });
      client.track('user-1', 'trigger_401');
      await client.flush();
      expect(client.transport_.calls).toHaveLength(1);

      client.track('user-1', 'after_revoke');
      await client.flush();
      expect(client.transport_.calls).toHaveLength(1);
    });
  });
});
