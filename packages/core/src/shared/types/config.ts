import type { ILogger } from '../../ports/logger.js';
import type { OnErrorCallback } from './callbacks.js';

export interface RetryConfig {
  maxRetries: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
}

export interface ResolvedConfig {
  apiKey: string;
  endpoint: string;
  flushInterval: number;
  batchSize: number;
  maxQueueSize: number;
  retry: RetryConfig;
  debug: boolean;
  logger?: ILogger;
  onError?: OnErrorCallback;
  requestTimeout: number;
}

export type AppssConfig = Pick<ResolvedConfig, 'apiKey'> &
  Partial<Omit<ResolvedConfig, 'apiKey' | 'retry'>> & {
    retry?: Partial<RetryConfig>;
  };
