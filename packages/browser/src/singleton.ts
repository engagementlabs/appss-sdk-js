import type { AppssConfig, EventProperties } from '@appss/sdk-core';
import { BrowserAppssClient } from './browser-client.js';

let client: BrowserAppssClient | null = null;

function getClient(): BrowserAppssClient {
  if (!client) throw new Error('SDK not initialized. Call init() first.');
  return client;
}

export function init(config: AppssConfig): void {
  if (client) {
    void client.destroy();
  }
  client = new BrowserAppssClient();
  client.init(config);
}

export function identify(distinctId: string): void {
  getClient().identify(distinctId);
}

export function track(event: string, properties?: EventProperties): void {
  getClient().track(event, properties);
}

export function setUserProperty(key: string, value: unknown): void {
  getClient().setUserProperty(key, value);
}

export function setUserProperties(properties: Record<string, unknown>): void {
  getClient().setUserProperties(properties);
}

export async function flushUserProperties(): Promise<void> {
  return getClient().flushUserProperties();
}

export async function flush(): Promise<void> {
  return getClient().flush();
}

export function optOut(): void {
  getClient().optOut();
}

export function optIn(): void {
  getClient().optIn();
}

export function isOptedOut(): boolean {
  return getClient().isOptedOut();
}

export async function destroy(): Promise<void> {
  const c = client;
  client = null;
  await c?.destroy();
}