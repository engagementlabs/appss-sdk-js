import type { IEventQueue, AppssEvent } from '@appss/sdk-core';

export interface MemoryQueueOptions {
  maxSize: number;
  onOverflow?: (droppedCount: number) => void;
}

export class MemoryQueue implements IEventQueue {
  private events: AppssEvent[] = [];
  private readonly maxSize: number;
  private readonly onOverflow?: (droppedCount: number) => void;

  constructor(options: MemoryQueueOptions) {
    this.maxSize = options.maxSize;
    this.onOverflow = options.onOverflow;
  }

  enqueue(event: AppssEvent): void {
    this.events.push(event);
    if (this.events.length > this.maxSize) {
      const dropCount = this.events.length - this.maxSize;
      this.events.splice(0, dropCount);
      this.onOverflow?.(dropCount);
    }
  }

  drain(maxCount: number): AppssEvent[] {
    return this.events.splice(0, maxCount);
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
  }
}
