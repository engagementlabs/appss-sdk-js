import type { ITransport } from '../../ports/transport.js';
import type { ILogger } from '../../ports/logger.js';
import type { DispatchResult } from '../../shared/types/internal.js';
import { handleResponse } from '../../domain/transport/response-handler.js';
import { TransportAction } from '../../shared/types/internal.js';
import { RetryPolicy } from '../../domain/transport/retry-policy.js';
import { MaxRetriesExceededError } from '../../shared/errors/index.js';
import { createTransportError } from '../errors/error-factory.js';

export class BatchDispatcher {
  private readonly transport: ITransport;
  private readonly retryPolicy: RetryPolicy;
  private readonly logger: ILogger;
  private stopped = false;

  constructor(transport: ITransport, retryPolicy: RetryPolicy, logger: ILogger) {
    this.transport = transport;
    this.retryPolicy = retryPolicy;
    this.logger = logger;
  }

  isStopped(): boolean {
    return this.stopped;
  }

  async dispatch(path: string, body: unknown, headers: Record<string, string>): Promise<DispatchResult> {
    if (this.stopped) {
      this.logger.warn('Sends stopped (API key revoked)');
      return { success: false };
    }

    for (let attempt = 1; this.retryPolicy.shouldRetry(attempt); attempt++) {
      try {
        const response = await this.transport.send(path, body, headers);
        const result = handleResponse(response);

        switch (result.action) {
          case TransportAction.SUCCESS:
            this.logger.debug('Request sent', { path });
            return { success: true };

          case TransportAction.SPLIT_AND_RETRY:
            return { success: false, splitRequested: true };

          case TransportAction.STOP:
            this.stopped = true;
            return {
              success: false,
              error: result.errorCode
                ? createTransportError(result.errorCode, result.errorMessage)
                : undefined,
            };

          case TransportAction.DROP:
            return {
              success: false,
              error: result.errorCode
                ? createTransportError(result.errorCode, result.errorMessage)
                : undefined,
            };

          case TransportAction.RATE_LIMIT: {
            const delay = result.retryAfterMs ?? this.retryPolicy.getDelay(attempt);
            this.logger.warn('Rate limited', { retryAfterMs: delay });
            await RetryPolicy.wait(delay);
            continue;
          }

          case TransportAction.RETRY:
            this.logger.warn(result.errorMessage ?? 'Retrying', { attempt });
            await RetryPolicy.wait(this.retryPolicy.getDelay(attempt));
            continue;
        }
      } catch {
        if (!this.retryPolicy.shouldRetry(attempt + 1)) {
          return { success: false, error: new MaxRetriesExceededError() };
        }
        await RetryPolicy.wait(this.retryPolicy.getDelay(attempt));
      }
    }

    return { success: false, error: new MaxRetriesExceededError() };
  }
}
