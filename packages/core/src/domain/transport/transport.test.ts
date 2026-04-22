import { describe, it, expect } from 'vitest';
import { handleResponse, TransportAction } from './response-handler.js';
import { RetryPolicy } from './retry-policy.js';
import { ErrorCode } from '../../shared/errors/error-codes.js';

describe('handleResponse', () => {
  it('200 → SUCCESS', () => {
    expect(handleResponse({ statusCode: 200, headers: {} }).action).toBe(TransportAction.SUCCESS);
  });
  it('400 → DROP with errorCode', () => {
    const r = handleResponse({ statusCode: 400, headers: {} });
    expect(r.action).toBe(TransportAction.DROP);
    expect(r.errorCode).toBe(ErrorCode.PROTOCOL_ERROR);
  });
  it('401 → STOP', () => {
    const r = handleResponse({ statusCode: 401, headers: {} });
    expect(r.action).toBe(TransportAction.STOP);
    expect(r.errorCode).toBe(ErrorCode.API_KEY_REVOKED);
  });
  it('413 → SPLIT_AND_RETRY', () => {
    expect(handleResponse({ statusCode: 413, headers: {} }).action).toBe(TransportAction.SPLIT_AND_RETRY);
  });
  it('429 → RATE_LIMIT with Retry-After', () => {
    const r = handleResponse({ statusCode: 429, headers: { 'retry-after': '5' } });
    expect(r.action).toBe(TransportAction.RATE_LIMIT);
    expect(r.retryAfterMs).toBe(5000);
  });
  it('500 → RETRY', () => {
    const r = handleResponse({ statusCode: 500, headers: {} });
    expect(r.action).toBe(TransportAction.RETRY);
    expect(r.errorCode).toBe(ErrorCode.NETWORK_ERROR);
  });
});

describe('RetryPolicy', () => {
  it('shouldRetry within maxRetries', () => {
    const p = new RetryPolicy({ maxRetries: 3 });
    expect(p.shouldRetry(3)).toBe(true);
    expect(p.shouldRetry(4)).toBe(false);
  });
  it('getDelay without jitter is deterministic', () => {
    const p = new RetryPolicy({ baseBackoffMs: 1000, maxBackoffMs: 16000, jitterFactor: 0 });
    expect(p.getDelay(1)).toBe(1000);
    expect(p.getDelay(2)).toBe(2000);
    expect(p.getDelay(5)).toBe(16000);
  });
});
