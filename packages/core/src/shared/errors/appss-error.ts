import type { ErrorCode } from './error-codes.js';

export type ErrorSeverity = 'warn' | 'error';

export class AppssError extends Error {
  readonly code: ErrorCode;
  readonly severity: ErrorSeverity;
  readonly retryable: boolean;

  constructor(message: string, code: ErrorCode, severity: ErrorSeverity, retryable: boolean) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.severity = severity;
    this.retryable = retryable;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
