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

export function validateRetryConfig(retry: Partial<RetryConfig>): void {
  if (retry.maxRetries !== undefined && (!Number.isInteger(retry.maxRetries) || retry.maxRetries < 0)) {
    throw new TypeError('retry.maxRetries must be a non-negative integer.');
  }

  if (retry.baseBackoffMs !== undefined && (retry.baseBackoffMs <= 0 || !Number.isFinite(retry.baseBackoffMs))) {
    throw new TypeError('retry.baseBackoffMs must be a positive number.');
  }

  if (retry.maxBackoffMs !== undefined && (retry.maxBackoffMs <= 0 || !Number.isFinite(retry.maxBackoffMs))) {
    throw new TypeError('retry.maxBackoffMs must be a positive number.');
  }
}

export function validateConfig(config: AppssConfig): void {
  if (!config.apiKey || config.apiKey.trim().length === 0) {
    throw new InvalidApiKeyError('API key is required and cannot be empty.');
  }

  if (config.flushInterval !== undefined && (config.flushInterval <= 0 || !Number.isFinite(config.flushInterval))) {
    throw new TypeError('flushInterval must be a positive number.');
  }

  if (config.batchSize !== undefined && (!Number.isInteger(config.batchSize) || config.batchSize <= 0)) {
    throw new TypeError('batchSize must be a positive integer.');
  }

  if (config.maxQueueSize !== undefined && (!Number.isInteger(config.maxQueueSize) || config.maxQueueSize <= 0)) {
    throw new TypeError('maxQueueSize must be a positive integer.');
  }

  if (config.requestTimeout !== undefined && (config.requestTimeout <= 0 || !Number.isFinite(config.requestTimeout))) {
    throw new TypeError('requestTimeout must be a positive number.');
  }

  if (config.retry) {
    validateRetryConfig(config.retry);
  }
}

export function resolveConfig(config: AppssConfig): ResolvedConfig {
  return {
    apiKey: config.apiKey,
    endpoint: config.endpoint ?? DEFAULT_ENDPOINT,
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
