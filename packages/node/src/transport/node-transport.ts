import type { ITransport, TransportResponse } from '@appss/sdk-core';

export class NodeTransport implements ITransport {
  private readonly endpoint: string;
  private readonly timeoutMs: number;

  constructor(endpoint: string, timeoutMs: number) {
    this.endpoint = endpoint;
    this.timeoutMs = timeoutMs;
  }

  async send(path: string, body: unknown, headers: Record<string, string>): Promise<TransportResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.endpoint}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
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
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
