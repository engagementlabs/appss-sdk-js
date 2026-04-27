import type { AppssConfig } from '@appss/sdk-core';
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

  track(distinctId: string, event: string, properties?: Record<string, unknown>): void {
    this.client.track(distinctId, event, properties);
  }

  setUserProperty(distinctId: string, key: string, value: unknown): void {
    this.client.setUserProperty(distinctId, key, value);
  }

  setUserProperties(distinctId: string, properties: Record<string, unknown>): void {
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
