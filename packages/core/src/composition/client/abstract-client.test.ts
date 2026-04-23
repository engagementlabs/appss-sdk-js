import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AbstractAppssClient } from './abstract-client.js';
import { NotIdentifiedError } from '../../shared/errors/index.js';
import type { ITransport } from '../../ports/transport.js';
import type { ILogger } from '../../ports/logger.js';
import type { IEventQueue } from '../../ports/queue.js';
import type { ResolvedConfig } from '../../shared/types/config.js';
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
  enqueue(event: AppssEvent): void { this.events.push(event); }
  drain(n: number): AppssEvent[] { return this.events.splice(0, n); }
  peek(n: number): AppssEvent[] { return this.events.slice(0, n); }
  size(): number { return this.events.length; }
  isEmpty(): boolean { return this.events.length === 0; }
  clear(): void { this.events = []; }
}

class TestClient extends AbstractAppssClient {
  transport_ = new TestTransport();
  lifecycleRegistered = false;

  protected createTransport(_config: ResolvedConfig): ITransport { return this.transport_; }
  protected createQueue(_config: ResolvedConfig): IEventQueue { return new TestQueue(); }
  protected createLogger(_config: ResolvedConfig): ILogger { return new NoopLogger(); }
  protected registerLifecycleHandlers(): void { this.lifecycleRegistered = true; }
  protected unregisterLifecycleHandlers(): void { this.lifecycleRegistered = false; }
}

describe('AbstractAppssClient', () => {
  let client: TestClient;
  beforeEach(() => { client = new TestClient(); });

  describe('init', () => {
    it('configures SDK', () => {
      client.init({ apiKey: 'key' });
      expect(client.lifecycleRegistered).toBe(true);
    });
    it('throws on invalid apiKey', () => {
      expect(() => client.init({ apiKey: '' })).toThrow();
    });
    it('idempotent — cleans up previous state', () => {
      client.init({ apiKey: 'key' });
      client.identify('u');
      client.init({ apiKey: 'key2' });
      expect(client.lifecycleRegistered).toBe(true);
      const onError = vi.fn();
      client.init({ apiKey: 'key3', onError });
      client.track('x');
      expect(onError).toHaveBeenCalledOnce();
    });
  });

  describe('identify', () => {
    it('enables tracking', () => {
      client.init({ apiKey: 'key' });
      client.identify('user-1');
      client.track('test');
    });
    it('handles empty distinctId via handleError', () => {
      const onError = vi.fn();
      client.init({ apiKey: 'key', onError });
      client.identify('');
      expect(onError).toHaveBeenCalledOnce();
    });
    it('throws on empty distinctId in debug mode', () => {
      client.init({ apiKey: 'key', debug: true });
      expect(() => client.identify('')).toThrow(NotIdentifiedError);
    });
  });

  describe('track', () => {
    it('sends events to /api/v1/events', async () => {
      client.init({ apiKey: 'key' });
      client.identify('user-1');
      client.track('purchase', { amount: 9.99 });
      await client.flush();
      const eventCalls = client.transport_.calls.filter((c) => c.path === '/api/v1/events');
      expect(eventCalls.length).toBeGreaterThan(0);
    });
    it('auto-flushes on threshold', async () => {
      client.init({ apiKey: 'key', batchSize: 2 });
      client.identify('user-1');
      client.track('a'); client.track('b');
      await new Promise((r) => setTimeout(r, 10));
      const eventCalls = client.transport_.calls.filter((c) => c.path === '/api/v1/events');
      expect(eventCalls.length).toBeGreaterThan(0);
    });
    it('drops when opted out', async () => {
      client.init({ apiKey: 'key' });
      client.identify('user-1');
      client.optOut();
      client.track('x');
      await client.flush();
      expect(client.transport_.calls).toHaveLength(0);
    });
    it('throws NotIdentifiedError in debug mode', () => {
      expect(() => {
        client.init({ apiKey: 'key', debug: true });
        client.track('x');
      }).toThrow(NotIdentifiedError);
    });
    it('does not crash before init', () => {
      client.track('x');
    });
    it('calls onError in prod mode', () => {
      const onError = vi.fn();
      client.init({ apiKey: 'key', onError });
      client.track('x');
      expect(onError).toHaveBeenCalledOnce();
      expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(NotIdentifiedError);
    });
  });

  describe('setUserProperty', () => {
    it('setUserProperty sends immediately', async () => {
      client.init({ apiKey: 'key' });
      client.identify('user-1');
      client.setUserProperty('plan', 'pro');
      await new Promise((r) => setTimeout(r, 10));
      const propCalls = client.transport_.calls.filter((c) => c.path === '/api/v1/user-properties');
      expect(propCalls).toHaveLength(1);
      const body = propCalls[0]?.body as { properties: Record<string, unknown> };
      expect(body.properties['plan']).toBe('pro');
    });
    it('setUserProperties sends all in one request', async () => {
      client.init({ apiKey: 'key' });
      client.identify('user-1');
      client.setUserProperties({ a: 1, b: 2 });
      await new Promise((r) => setTimeout(r, 10));
      const propCalls = client.transport_.calls.filter((c) => c.path === '/api/v1/user-properties');
      expect(propCalls).toHaveLength(1);
      const body = propCalls[0]?.body as { properties: Record<string, unknown> };
      expect(body.properties['a']).toBe(1);
      expect(body.properties['b']).toBe(2);
    });
  });

  describe('consent', () => {
    it('works before init', () => {
      expect(client.isOptedOut()).toBe(false);
      client.optOut();
      expect(client.isOptedOut()).toBe(true);
      client.optIn();
      expect(client.isOptedOut()).toBe(false);
    });
  });

  describe('flush', () => {
    it('noop before init', async () => {
      await client.flush(); // should not crash
      expect(client.transport_.calls).toHaveLength(0);
    });
  });

  describe('destroy', () => {
    it('flushes and cleans up', async () => {
      client.init({ apiKey: 'key' });
      client.identify('u');
      client.track('final');
      await client.destroy();
      expect(client.lifecycleRegistered).toBe(false);
      expect(client.transport_.calls.length).toBeGreaterThan(0);
    });
    it('noop before init', async () => {
      await client.destroy(); // should not crash
    });
  });

  describe('401 stops sends', () => {
    it('stops future flushes', async () => {
      client.transport_.response = { statusCode: 401, headers: {} };
      client.init({ apiKey: 'key' });
      client.identify('u');
      client.track('trigger_401');
      await client.flush();
      expect(client.transport_.calls).toHaveLength(1);

      client.track('after_revoke');
      await client.flush();
      expect(client.transport_.calls).toHaveLength(1);
    });
  });
});
