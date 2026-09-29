import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FetchTransport } from './fetch-transport.js';

describe('FetchTransport', () => {
  const transport = new FetchTransport('https://ingest.test', 5000);

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends POST to endpoint + path', async () => {
    const mockResponse = {
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ accepted: 1 }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    const result = await transport.send('/api/v1/events', { batch: [] }, { Authorization: 'Bearer key' });

    expect(fetch).toHaveBeenCalledOnce();
    const call = vi.mocked(fetch).mock.calls[0];
    const [url, options] = [call?.[0], call?.[1]];
    expect(url).toBe('https://ingest.test/api/v1/events');
    expect((options as RequestInit).method).toBe('POST');
    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ accepted: 1 });
  });

  it('returns non-json body as undefined', async () => {
    const mockResponse = {
      status: 204,
      headers: new Headers(),
      json: () => Promise.reject(new Error('no json')),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    const result = await transport.send('/api/v1/events', {}, {});
    expect(result.statusCode).toBe(204);
    expect(result.body).toBeUndefined();
  });

  it('keeps sending through fetch with headers while the document is hidden', async () => {
    const beacon = vi.fn().mockReturnValue(true);
    vi.stubGlobal('document', { visibilityState: 'hidden' });
    vi.stubGlobal('navigator', { sendBeacon: beacon });
    vi.mocked(fetch).mockResolvedValue({
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ accepted: 1 }),
    } as unknown as Response);

    const result = await transport.send('/api/v1/events', { batch: [{ event: 'a' }] }, {
      Authorization: 'Bearer key',
    });

    expect(beacon).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledOnce();
    const options = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit;
    expect((options.headers as Record<string, string>).Authorization).toBe('Bearer key');
    expect(options.keepalive).toBe(true);
    expect(result.statusCode).toBe(200);
    vi.unstubAllGlobals();
  });

  it('falls back to a beacon with the key in the query when fetch will not start', async () => {
    const beacon = vi.fn().mockReturnValue(true);
    vi.stubGlobal('navigator', { sendBeacon: beacon });
    vi.mocked(fetch).mockRejectedValue(new TypeError('keepalive budget exceeded'));

    const result = await transport.send('/api/v1/events', { batch: [{ event: 'a' }] }, {
      Authorization: 'Bearer key-123',
    });

    expect(beacon).toHaveBeenCalledOnce();
    expect(String(beacon.mock.calls[0]?.[0])).toBe(
      'https://ingest.test/api/v1/events?api_key=key-123',
    );
    expect(result.statusCode).toBe(202);
    vi.unstubAllGlobals();
  });

  it('rethrows when even the beacon refuses', async () => {
    vi.stubGlobal('navigator', { sendBeacon: vi.fn().mockReturnValue(false) });
    vi.mocked(fetch).mockRejectedValue(new TypeError('offline'));

    await expect(
      transport.send('/api/v1/events', { batch: [] }, { Authorization: 'Bearer k' }),
    ).rejects.toThrow('offline');
    vi.unstubAllGlobals();
  });

  it('splits a batch that would blow the keepalive budget', async () => {
    vi.mocked(fetch).mockResolvedValue({
      status: 200,
      headers: new Headers(),
      json: () => Promise.resolve({}),
    } as unknown as Response);

    const batch = Array.from({ length: 4 }, () => ({ blob: 'x'.repeat(20_000) }));
    const result = await transport.send('/api/v1/events', { batch }, { Authorization: 'Bearer key' });

    expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(1);
    expect(result.statusCode).toBe(200);
  });

  it('parses response headers', async () => {
    const mockResponse = {
      status: 429,
      headers: new Headers({ 'retry-after': '5', 'content-type': 'text/plain' }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    const result = await transport.send('/api/v1/events', {}, {});
    expect(result.headers['retry-after']).toBe('5');
  });
});
