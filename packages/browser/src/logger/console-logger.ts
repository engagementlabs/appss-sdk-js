import type { ILogger } from '@appss/sdk-core';

export class ConsoleLogger implements ILogger {
  debug(message: string, context?: Record<string, unknown>): void {
    console.debug(this.format('DEBUG', message, context));
  }

  info(message: string, context?: Record<string, unknown>): void {
    console.info(this.format('INFO', message, context));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(this.format('WARN', message, context));
  }

  error(message: string, context?: Record<string, unknown>): void {
    console.error(this.format('ERROR', message, context));
  }

  private format(level: string, message: string, context?: Record<string, unknown>): string {
    const base = `[appss-sdk] ${level} ${message}`;
    return context ? `${base} ${JSON.stringify(context)}` : base;
  }
}
