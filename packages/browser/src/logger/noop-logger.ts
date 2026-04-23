import type { ILogger } from '@appss/sdk-core';

export class NoopLogger implements ILogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}
