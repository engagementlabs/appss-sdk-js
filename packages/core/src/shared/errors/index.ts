export { AppssError } from './appss-error.js';
export type { ErrorSeverity } from './appss-error.js';
export { ErrorCode } from './error-codes.js';

import { AppssError } from './appss-error.js';
import { ErrorCode } from './error-codes.js';

export class NotInitializedError extends AppssError {
  constructor(message = 'SDK not initialized. Call init() first.') {
    super(message, ErrorCode.NOT_INITIALIZED, 'warn', false);
  }
}

export class NotIdentifiedError extends AppssError {
  constructor(message = 'User not identified. Call identify() first.') {
    super(message, ErrorCode.NOT_IDENTIFIED, 'warn', false);
  }
}

export class InvalidApiKeyError extends AppssError {
  constructor(message = 'Invalid or missing API key.') {
    super(message, ErrorCode.INVALID_API_KEY, 'error', false);
  }
}

export class NetworkError extends AppssError {
  constructor(message = 'Network request failed.') {
    super(message, ErrorCode.NETWORK_ERROR, 'warn', true);
  }
}

export class RateLimitError extends AppssError {
  readonly retryAfterMs?: number;

  constructor(message = 'Rate limited by server.', retryAfterMs?: number) {
    super(message, ErrorCode.RATE_LIMITED, 'warn', true);
    this.retryAfterMs = retryAfterMs;
  }
}

export class ApiKeyRevokedError extends AppssError {
  constructor(message = 'API key has been revoked.') {
    super(message, ErrorCode.API_KEY_REVOKED, 'error', false);
  }
}

export class ProtocolError extends AppssError {
  constructor(message = 'Protocol error: server rejected the request.') {
    super(message, ErrorCode.PROTOCOL_ERROR, 'error', false);
  }
}

export class QueueOverflowError extends AppssError {
  readonly droppedCount: number;

  constructor(droppedCount: number) {
    super(`Queue overflow: dropped ${droppedCount} oldest events.`, ErrorCode.QUEUE_OVERFLOW, 'warn', false);
    this.droppedCount = droppedCount;
  }
}

export class MaxRetriesExceededError extends AppssError {
  constructor(message = 'Max retries exceeded. Batch dropped.') {
    super(message, ErrorCode.MAX_RETRIES_EXCEEDED, 'error', false);
  }
}
