import { describe, it, expect } from 'vitest';
import { BatchDispatcher } from './batch-dispatcher.js';
import { RetryPolicy } from '../../domain/transport/retry-policy.js';
import { MaxRetriesExceededError, ApiKeyRevokedError, ProtocolError } from '../../shared/errors/index.js';
import type { ITransport } from '../../ports/transport.js';
import type { ILogger } from '../../ports/logger.js';
import type { TransportResponse } from '../../shared/types/wire-protocol.js';

class NoopLogger implements ILogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

class MockTransport implements ITransport {
  readonly calls: { path: string; body: unknown }[] = [];
  responses: TransportResponse[] = [];
  private callIndex = 0;

  async send(path: string, body: unknown): Promise<TransportResponse> {
    this.calls.push({ path, body });
    return this.responses[this.callIndex++] ?? { statusCode: 200, headers: {} };
  }
}

const makeDispatcher = (transport: MockTransport) =>
  new BatchDispatcher(
    transport,
    new RetryPolicy({ maxRetries: 3, baseBackoffMs: 1, maxBackoffMs: 1, jitterFactor: 0 }),
    new NoopLogger(),
  );

describe('BatchDispatcher', () => {
  it('returns success on 200', async () => {
    const t = new MockTransport();
    t.responses = [{ statusCode: 200, headers: {} }];
    const result = await makeDispatcher(t).dispatch('/v1/events', { batch: [] }, {});
    expect(result.success).toBe(true);
    expect(t.calls[0]?.path).toBe('/v1/events');
  });

  it('returns error on 400 (DROP)', async () => {
    const t = new MockTransport();
    t.responses = [{ statusCode: 400, headers: {} }];
    const result = await makeDispatcher(t).dispatch('/v1/events', {}, {});
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(ProtocolError);
  });

  it('stops on 401 and rejects future dispatches', async () => {
    const t = new MockTransport();
    t.responses = [{ statusCode: 401, headers: {} }, { statusCode: 200, headers: {} }];
    const d = makeDispatcher(t);

    const r1 = await d.dispatch('/v1/events', {}, {});
    expect(r1.success).toBe(false);
    expect(r1.error).toBeInstanceOf(ApiKeyRevokedError);
    expect(d.isStopped()).toBe(true);

    const r2 = await d.dispatch('/v1/events', {}, {});
    expect(r2.success).toBe(false);
    expect(t.calls).toHaveLength(1);
  });

  it('returns splitRequested on 413', async () => {
    const t = new MockTransport();
    t.responses = [{ statusCode: 413, headers: {} }];
    const result = await makeDispatcher(t).dispatch('/v1/events', {}, {});
    expect(result.success).toBe(false);
    expect(result.splitRequested).toBe(true);
  });

  it('retries on 500 and eventually succeeds', async () => {
    const t = new MockTransport();
    t.responses = [
      { statusCode: 500, headers: {} },
      { statusCode: 500, headers: {} },
      { statusCode: 200, headers: {} },
    ];
    const result = await makeDispatcher(t).dispatch('/v1/events', {}, {});
    expect(result.success).toBe(true);
    expect(t.calls).toHaveLength(3);
  });

  it('returns MaxRetriesExceededError after exhaustion', async () => {
    const t = new MockTransport();
    t.responses = Array(10).fill({ statusCode: 500, headers: {} });
    const result = await makeDispatcher(t).dispatch('/v1/events', {}, {});
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(MaxRetriesExceededError);
  });

  it('works with user-properties endpoint', async () => {
    const t = new MockTransport();
    t.responses = [{ statusCode: 200, headers: {} }];
    const result = await makeDispatcher(t).dispatch('/v1/user-properties', { distinct_id: '1', properties: {} }, {});
    expect(result.success).toBe(true);
    expect(t.calls[0]?.path).toBe('/v1/user-properties');
  });
});
