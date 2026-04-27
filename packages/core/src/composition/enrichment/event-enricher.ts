import type { EventProperties } from '../../shared/types/wire-protocol.js';

export class EventEnricher {
  private readonly properties: Record<string, unknown> = {};

  set(key: string, value: unknown): void {
    this.properties[key] = value;
  }

  setAll(properties: Record<string, unknown>): void {
    Object.assign(this.properties, properties);
  }

  remove(key: string): void {
    delete this.properties[key];
  }

  reset(): void {
    for (const key of Object.keys(this.properties)) {
      delete this.properties[key];
    }
  }

  enrich(eventProperties?: EventProperties): EventProperties {
    return { ...eventProperties, ...this.properties };
  }
}
