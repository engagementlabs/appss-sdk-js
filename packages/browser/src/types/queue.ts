export interface PersistentQueueOptions {
  maxSize: number;
  storageKey: string;
  onOverflow?: (droppedCount: number) => void;
}
