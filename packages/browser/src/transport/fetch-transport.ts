import type { ITransport, TransportResponse } from '@appss/sdk-core';
import { sendViaBeacon } from './beacon-sender.js';

/**
 * `keepalive` requests share a 64 KB budget per the fetch spec, and a body over it makes
 * fetch reject outright. Splitting below that ceiling keeps large batches deliverable.
 */
const KEEPALIVE_MAX_BYTES = 60_000;

/**
 * The ingest key for a request that cannot carry headers. `sendBeacon` has no way to set
 * Authorization, so the key rides in the query instead — the one place a beacon can put it.
 */
function apiKeyQueryUrl(url: string, headers: Record<string, string>): string {
  const raw = headers.Authorization ?? headers.authorization ?? '';
  const key = raw.startsWith('Bearer ') ? raw.slice(7).trim() : '';
  if (!key) {
    return url;
  }
  return `${url}${url.includes('?') ? '&' : '?'}api_key=${encodeURIComponent(key)}`;
}

interface BatchPayload {
  batch: unknown[];
}

function isBatchPayload(payload: unknown): payload is BatchPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    Array.isArray((payload as { batch?: unknown }).batch)
  );
}

function byteLength(json: string): number {
  if (typeof TextEncoder === 'undefined') {
    return json.length;
  }
  return new TextEncoder().encode(json).length;
}

export class FetchTransport implements ITransport {
  private readonly endpoint: string;
  private readonly timeoutMs: number;

  constructor(endpoint: string, timeoutMs: number) {
    this.endpoint = endpoint;
    this.timeoutMs = timeoutMs;
  }

  /**
   * `fetch` with `keepalive` first, in every page state: it carries the Authorization header
   * and outlives the document, which is what the beacon used to be here for. Switching to a
   * beacon merely because the tab went hidden is what broke ingest — a beacon cannot set
   * headers, so those batches arrived unauthenticated, came back 401, and were reported as
   * delivered.
   *
   * The beacon stays as a genuine last resort, for when fetch will not even start: no
   * `keepalive` support, or a body over its shared 64 KB budget. There the key travels in the
   * query, since that is the only place a beacon can put it. Its outcome is unknowable —
   * hence 202 rather than 200, which the core still counts as delivered.
   */
  async send(path: string, body: unknown, headers: Record<string, string>): Promise<TransportResponse> {
    const url = `${this.endpoint}${path}`;
    const payload = JSON.stringify(body);

    if (byteLength(payload) > KEEPALIVE_MAX_BYTES && isBatchPayload(body) && body.batch.length > 1) {
      const mid = Math.ceil(body.batch.length / 2);
      const head = await this.send(path, { ...body, batch: body.batch.slice(0, mid) }, headers);
      const tail = await this.send(path, { ...body, batch: body.batch.slice(mid) }, headers);
      return tail.statusCode >= 400 ? tail : head;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: payload,
        signal: controller.signal,
        keepalive: true,
      });

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseBody: unknown;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        responseBody = await response.json();
      }

      return {
        statusCode: response.status,
        headers: responseHeaders,
        body: responseBody,
      };
    } catch (error: unknown) {
      if (sendViaBeacon(apiKeyQueryUrl(url, headers), body)) {
        return { statusCode: 202, headers: {} };
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
