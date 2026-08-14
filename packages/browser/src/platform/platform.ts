import type { ILogger } from '@appss/sdk-core';

export interface Platform {
  readonly name: string;
  isAvailable(): boolean;
  getUserId(): string | null;
  getProperties(): Record<string, unknown>;
  getEventContext(logger?: ILogger | null): Record<string, unknown>;
}
