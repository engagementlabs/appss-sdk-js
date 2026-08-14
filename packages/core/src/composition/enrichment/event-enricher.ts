import type { EventProperties } from '../../shared/types/wire-protocol.js';

export type EventContextProvider = () => EventProperties;

export class EventEnricher {
  private readonly properties: Record<string, unknown> = {};
  private contextProvider: EventContextProvider | null = null;

  set(key: string, value: unknown): void {
    this.properties[key] = value;
  }

  setAll(properties: Record<string, unknown>): void {
    Object.assign(this.properties, properties);
  }

  setContextProvider(provider: EventContextProvider | null): void {
    this.contextProvider = provider;
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
    return { ...this.properties, ...this.collectContext(), ...eventProperties };
  }

  private collectContext(): EventProperties {
    if (!this.contextProvider) return {};

    try {
      return this.contextProvider();
    } catch {
      return {};
    }
  }
}
