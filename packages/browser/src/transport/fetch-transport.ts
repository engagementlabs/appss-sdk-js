import type { ITransport, TransportResponse } from '@appss/sdk-core';
import { sendViaBeacon } from './beacon-sender.js';

export class FetchTransport implements ITransport {
  private readonly endpoint: string;
  private readonly timeoutMs: number;

  constructor(endpoint: string, timeoutMs: number) {
    this.endpoint = endpoint;
    this.timeoutMs = timeoutMs;
  }

  async send(path: string, body: unknown, headers: Record<string, string>): Promise<TransportResponse> {
    const url = `${this.endpoint}${path}`;

    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      sendViaBeacon(url, body);
      return { statusCode: 200, headers: {} };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
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
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
