import type { AppssEvent } from '../shared/types/wire-protocol.js';

export interface IEventQueue {
  enqueue(event: AppssEvent): void;
  drain(maxCount: number): AppssEvent[];
  peek(maxCount: number): AppssEvent[];
  size(): number;
  isEmpty(): boolean;
  clear(): void;
}
