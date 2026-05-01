import type { AppssConfig, DistinctId, EventName, TrackArgs } from '@appss/sdk-core';
import { NodeInternalClient } from './internal-client.js';

export class AppssNodeClient {
  private readonly client: NodeInternalClient;

  constructor(config: AppssConfig) {
    this.client = new NodeInternalClient();
    this.client.init(config);
  }

  setSuperProperties(properties: Record<string, unknown>): void {
    this.client.setSuperProperties(properties);
  }

  resetSuperProperties(): void {
    this.client.resetSuperProperties();
  }

  track<E extends EventName>(distinctId: DistinctId, event: E, ...args: TrackArgs<E>): void {
    this.client.track(distinctId, event, ...args);
  }

  setUserProperty(distinctId: DistinctId, key: string, value: unknown): void {
    this.client.setUserProperty(distinctId, key, value);
  }

  setUserProperties(distinctId: DistinctId, properties: Record<string, unknown>): void {
    this.client.setUserProperties(distinctId, properties);
  }

  flush(): Promise<void> {
    return this.client.flush();
  }

  destroy(): Promise<void> {
    return this.client.destroy();
  }
}

export function createAppss(config: AppssConfig): AppssNodeClient {
  return new AppssNodeClient(config);
}
