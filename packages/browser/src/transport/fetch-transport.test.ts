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
