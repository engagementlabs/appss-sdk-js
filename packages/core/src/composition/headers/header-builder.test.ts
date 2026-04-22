import { describe, it, expect } from 'vitest';
import { buildHeaders } from './header-builder.js';
import { SDK_NAME, SDK_VERSION, PROTOCOL_VERSION } from '../../shared/constants.js';
import type { ResolvedConfig } from '../../shared/types/config.js';

const config: ResolvedConfig = {
  apiKey: 'test-key-123',
  endpoint: 'https://ingest.appss.store',
  flushInterval: 10000,
  batchSize: 50,
  maxQueueSize: 10000,
  retry: { maxRetries: 5, baseBackoffMs: 1000, maxBackoffMs: 16000 },
  debug: false,
  requestTimeout: 30000,
};

describe('buildHeaders', () => {
  it('includes Authorization with Bearer token', () => {
    const h = buildHeaders(config);
    expect(h['Authorization']).toBe('Bearer test-key-123');
  });

  it('includes Content-Type', () => {
    expect(buildHeaders(config)['Content-Type']).toBe('application/json');
  });

  it('includes X-Appss-Sdk', () => {
    expect(buildHeaders(config)['X-Appss-Sdk']).toBe(`${SDK_NAME}/${SDK_VERSION}`);
  });

  it('includes X-Appss-Protocol-Version', () => {
    expect(buildHeaders(config)['X-Appss-Protocol-Version']).toBe(PROTOCOL_VERSION);
  });
});
