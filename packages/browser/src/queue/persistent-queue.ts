import type { IEventQueue } from '@appss/sdk-core';
import type { AppssEvent } from '../types/event.js';
import type { PersistentQueueOptions } from '../types/queue.js';

export class PersistentQueue implements IEventQueue {
  private events: AppssEvent[] = [];
  private readonly maxSize: number;
  private readonly storageKey: string;
  private readonly onOverflow?: (droppedCount: number) => void;

  constructor(options: PersistentQueueOptions) {
    this.maxSize = options.maxSize;
    this.storageKey = options.storageKey;
    this.onOverflow = options.onOverflow;
    this.restore();
  }

  enqueue(event: AppssEvent): void {
    this.events.push(event);

    if (this.events.length > this.maxSize) {
      const dropCount = this.events.length - this.maxSize;
      this.events.splice(0, dropCount);
      this.onOverflow?.(dropCount);
    }

    this.persist();
  }

  drain(maxCount: number): AppssEvent[] {
    const drained = this.events.splice(0, maxCount);
    this.persist();
    return drained;
  }

  peek(maxCount: number): AppssEvent[] {
    return this.events.slice(0, maxCount);
  }

  size(): number {
    return this.events.length;
  }

  isEmpty(): boolean {
    return this.events.length === 0;
  }

  clear(): void {
    this.events = [];
    this.persist();
  }

  private persist(): void {
    try {
      const serialized = JSON.stringify(this.events);
      localStorage.setItem(this.storageKey, serialized);
    } catch { /* noop */ }
  }

  private restore(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return;

      const parsed: unknown = JSON.parse(stored);
      if (!Array.isArray(parsed)) return;

      this.events = parsed.map((item: Record<string, unknown>) => ({
        event: String(item['event'] ?? ''),
        distinctId: String(item['distinctId'] ?? ''),
        insertId: String(item['insertId'] ?? ''),
        timestamp: new Date(String(item['timestamp'] ?? 0)),
        properties: item['properties'] as Record<string, unknown> | undefined,
      }));
    } catch {
      this.events = [];
    }
  }
}
