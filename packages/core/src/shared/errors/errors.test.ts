import { describe, it, expect } from 'vitest';
import { AppssError } from './appss-error.js';
import { ErrorCode } from './error-codes.js';
import {
  NotInitializedError,
  NotIdentifiedError,
  InvalidApiKeyError,
  NetworkError,
  RateLimitError,
  ApiKeyRevokedError,
  ProtocolError,
  QueueOverflowError,
  MaxRetriesExceededError,
} from './index.js';

describe('AppssError', () => {
  it('has correct name, code, severity, retryable', () => {
    const err = new AppssError('test', ErrorCode.NETWORK_ERROR, 'warn', true);
    expect(err.name).toBe('AppssError');
    expect(err.message).toBe('test');
    expect(err.code).toBe(ErrorCode.NETWORK_ERROR);
    expect(err.severity).toBe('warn');
    expect(err.retryable).toBe(true);
    expect(err).toBeInstanceOf(Error);
  });
});

describe('NotInitializedError', () => {
  it('defaults', () => {
    const err = new NotInitializedError();
    expect(err).toBeInstanceOf(AppssError);
    expect(err.code).toBe(ErrorCode.NOT_INITIALIZED);
    expect(err.severity).toBe('warn');
    expect(err.retryable).toBe(false);
  });
});

describe('NotIdentifiedError', () => {
  it('defaults', () => {
    const err = new NotIdentifiedError();
    expect(err.code).toBe(ErrorCode.NOT_IDENTIFIED);
  });
});

describe('InvalidApiKeyError', () => {
  it('defaults', () => {
    const err = new InvalidApiKeyError();
    expect(err.code).toBe(ErrorCode.INVALID_API_KEY);
    expect(err.severity).toBe('error');
  });
});

describe('NetworkError', () => {
  it('is retryable', () => {
    const err = new NetworkError();
    expect(err.retryable).toBe(true);
  });
});

describe('RateLimitError', () => {
  it('stores retryAfterMs', () => {
    const err = new RateLimitError('limited', 5000);
    expect(err.retryAfterMs).toBe(5000);
  });
  it('retryAfterMs undefined by default', () => {
    expect(new RateLimitError().retryAfterMs).toBeUndefined();
  });
});

describe('ApiKeyRevokedError', () => {
  it('not retryable', () => {
    expect(new ApiKeyRevokedError().retryable).toBe(false);
  });
});

describe('ProtocolError', () => {
  it('not retryable', () => {
    expect(new ProtocolError().retryable).toBe(false);
  });
});

describe('QueueOverflowError', () => {
  it('stores droppedCount', () => {
    const err = new QueueOverflowError(10);
    expect(err.droppedCount).toBe(10);
    expect(err.message).toContain('10');
  });
});

describe('MaxRetriesExceededError', () => {
  it('not retryable', () => {
    expect(new MaxRetriesExceededError().retryable).toBe(false);
  });
});
