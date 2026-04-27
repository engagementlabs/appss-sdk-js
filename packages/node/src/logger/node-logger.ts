import type { ILogger } from '@appss/sdk-core';

export class NodeLogger implements ILogger {
  debug(message: string, context?: Record<string, unknown>): void {
    process.stdout.write(`[appss-sdk] DEBUG ${message}${context ? ' ' + JSON.stringify(context) : ''}\n`);
  }

  info(message: string, context?: Record<string, unknown>): void {
    process.stdout.write(`[appss-sdk] INFO ${message}${context ? ' ' + JSON.stringify(context) : ''}\n`);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    process.stderr.write(`[appss-sdk] WARN ${message}${context ? ' ' + JSON.stringify(context) : ''}\n`);
  }

  error(message: string, context?: Record<string, unknown>): void {
    process.stderr.write(`[appss-sdk] ERROR ${message}${context ? ' ' + JSON.stringify(context) : ''}\n`);
  }
}

export class NoopLogger implements ILogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}
