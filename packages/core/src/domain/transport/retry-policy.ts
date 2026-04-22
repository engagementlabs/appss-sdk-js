import {
  MAX_RETRIES,
  BASE_BACKOFF_MS,
  MAX_BACKOFF_MS,
  JITTER_FACTOR,
} from '../../shared/constants.js';

export interface RetryPolicyOptions {
  maxRetries?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  jitterFactor?: number;
}

export class RetryPolicy {
  private readonly maxRetries: number;
  private readonly baseBackoffMs: number;
  private readonly maxBackoffMs: number;
  private readonly jitterFactor: number;

  constructor(options: RetryPolicyOptions = {}) {
    this.maxRetries = options.maxRetries ?? MAX_RETRIES;
    this.baseBackoffMs = options.baseBackoffMs ?? BASE_BACKOFF_MS;
    this.maxBackoffMs = options.maxBackoffMs ?? MAX_BACKOFF_MS;
    this.jitterFactor = options.jitterFactor ?? JITTER_FACTOR;
  }

  getDelay(attempt: number): number {
    const exponential = Math.min(
      this.baseBackoffMs * Math.pow(2, attempt - 1),
      this.maxBackoffMs,
    );
    const jitter = exponential * (1 + (Math.random() * 2 - 1) * this.jitterFactor);
    return Math.round(jitter);
  }

  shouldRetry(attempt: number): boolean {
    return attempt <= this.maxRetries;
  }

  static wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
