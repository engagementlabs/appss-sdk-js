import type { AppssConfig, ResolvedConfig, RetryConfig } from '../types/config.js';
import {
  DEFAULT_BATCH_SIZE,
  DEFAULT_ENDPOINT,
  DEFAULT_FLUSH_INTERVAL_MS,
  MAX_QUEUE_SIZE,
  MAX_RETRIES,
  BASE_BACKOFF_MS,
  MAX_BACKOFF_MS,
  REQUEST_TIMEOUT_MS,
} from '../constants.js';
import { InvalidApiKeyError } from '../errors/index.js';
import { assertPositiveNumber, assertPositiveInteger, assertNonNegativeInteger } from '../utils/validation.js';

export function validateRetryConfig(retry: Partial<RetryConfig>): void {
  assertNonNegativeInteger(retry.maxRetries, 'retry.maxRetries');
  assertPositiveNumber(retry.baseBackoffMs, 'retry.baseBackoffMs');
  assertPositiveNumber(retry.maxBackoffMs, 'retry.maxBackoffMs');
}

export function validateConfig(config: AppssConfig): void {
  if (!config.apiKey || config.apiKey.trim().length === 0) {
    throw new InvalidApiKeyError('API key is required and cannot be empty.');
  }

  assertPositiveNumber(config.flushInterval, 'flushInterval');
  assertPositiveInteger(config.batchSize, 'batchSize');
  assertPositiveInteger(config.maxQueueSize, 'maxQueueSize');
  assertPositiveNumber(config.requestTimeout, 'requestTimeout');

  if (config.retry) {
    validateRetryConfig(config.retry);
  }
}

export function resolveConfig(config: AppssConfig): ResolvedConfig {
  return {
    apiKey: config.apiKey,
    endpoint: (config.endpoint ?? DEFAULT_ENDPOINT).replace(/\/+$/, ''),
    flushInterval: config.flushInterval ?? DEFAULT_FLUSH_INTERVAL_MS,
    batchSize: config.batchSize ?? DEFAULT_BATCH_SIZE,
    maxQueueSize: config.maxQueueSize ?? MAX_QUEUE_SIZE,
    retry: {
      maxRetries: config.retry?.maxRetries ?? MAX_RETRIES,
      baseBackoffMs: config.retry?.baseBackoffMs ?? BASE_BACKOFF_MS,
      maxBackoffMs: config.retry?.maxBackoffMs ?? MAX_BACKOFF_MS,
    },
    debug: config.debug ?? false,
    onError: config.onError,
    requestTimeout: config.requestTimeout ?? REQUEST_TIMEOUT_MS,
  };
}
