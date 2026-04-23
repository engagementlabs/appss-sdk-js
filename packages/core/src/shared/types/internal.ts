import type { EventProperties } from './wire-protocol.js';
import type { ErrorCode } from '../errors/error-codes.js';
import type { AppssError } from '../errors/appss-error.js';

export interface BuildEventParams {
  event: string;
  distinctId: string;
  properties?: EventProperties;
}

export enum TransportAction {
  SUCCESS = 'SUCCESS',
  DROP = 'DROP',
  RETRY = 'RETRY',
  SPLIT_AND_RETRY = 'SPLIT_AND_RETRY',
  RATE_LIMIT = 'RATE_LIMIT',
  STOP = 'STOP',
}

export interface HandleResult {
  action: TransportAction;
  retryAfterMs?: number;
  errorCode?: ErrorCode;
  errorMessage?: string;
}

export interface RetryPolicyOptions {
  maxRetries?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  jitterFactor?: number;
}

export interface DispatchResult {
  success: boolean;
  splitRequested?: boolean;
  error?: AppssError;
}
