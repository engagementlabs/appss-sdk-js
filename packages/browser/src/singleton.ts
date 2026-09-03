import type { AppssConfig, EventProperties } from '@appss/sdk-core';
import { BrowserAppssClient } from './browser-client.js';

let client: BrowserAppssClient | null = null;

export function init(config: AppssConfig): void {
  if (client) {
    void client.destroy();
  }
  client = new BrowserAppssClient();
  client.init(config);
}

// Tracking calls are no-ops before init() (or when analytics is unconfigured) — never throw.
// A host app must keep working whether or not analytics is available, so a missing/failed init
// must not turn a track() call into a crash. init() itself still surfaces config errors.
export function identify(distinctId: string): void {
  client?.identify(distinctId);
}

export function track(event: string, properties?: EventProperties): void {
  client?.trackEvent(event, properties);
}

export function setUserProperty(key: string, value: unknown): void {
  client?.setProperty(key, value);
}

export function setUserProperties(properties: Record<string, unknown>): void {
  client?.setProperties(properties);
}

export async function flush(): Promise<void> {
  await client?.flush();
}

export function optOut(): void {
  client?.optOut();
}

export function optIn(): void {
  client?.optIn();
}

export function isOptedOut(): boolean {
  return client?.isOptedOut() ?? false;
}

export async function destroy(): Promise<void> {
  const c = client;
  client = null;
  await c?.destroy();
}
