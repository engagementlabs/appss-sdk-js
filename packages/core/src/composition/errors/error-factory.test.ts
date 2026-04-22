import { describe, it, expect } from 'vitest';
import { createTransportError } from './error-factory.js';
import { ErrorCode } from '../../shared/errors/error-codes.js';
import {
  NetworkError,
  RateLimitError,
  ApiKeyRevokedError,
  ProtocolError,
} from '../../shared/errors/index.js';

describe('createTransportError', () => {
  it('NETWORK_ERROR → NetworkError', () => {
    const err = createTransportError(ErrorCode.NETWORK_ERROR, 'timeout');
    expect(err).toBeInstanceOf(NetworkError);
    expect(err.message).toBe('timeout');
  });

  it('RATE_LIMITED → RateLimitError with retryAfterMs', () => {
    const err = createTransportError(ErrorCode.RATE_LIMITED, 'slow down', 5000);
    expect(err).toBeInstanceOf(RateLimitError);
    expect((err as RateLimitError).retryAfterMs).toBe(5000);
  });

  it('API_KEY_REVOKED → ApiKeyRevokedError', () => {
    expect(createTransportError(ErrorCode.API_KEY_REVOKED)).toBeInstanceOf(ApiKeyRevokedError);
  });

  it('PROTOCOL_ERROR → ProtocolError', () => {
    expect(createTransportError(ErrorCode.PROTOCOL_ERROR)).toBeInstanceOf(ProtocolError);
  });

  it('unknown code → ProtocolError fallback', () => {
    const err = createTransportError(ErrorCode.QUEUE_OVERFLOW, 'unexpected');
    expect(err).toBeInstanceOf(ProtocolError);
  });
});
