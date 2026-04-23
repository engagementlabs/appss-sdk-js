import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PersistentQueue } from './persistent-queue.js';

const STORAGE_KEY = '__test_queue';

const ev = (name: string) => ({
  event: name,
  distinctId: '1',
  insertId: crypto.randomUUID(),
  timestamp: new Date(),
});

describe('PersistentQueue', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('enqueue/drain FIFO', () => {
    const q = new PersistentQueue({ maxSize: 10, storageKey: STORAGE_KEY });
    q.enqueue(ev('a'));
    q.enqueue(ev('b'));
    const d = q.drain(1);
    expect(d[0]?.event).toBe('a');
    expect(q.size()).toBe(1);
  });

  it('overflow drops oldest', () => {
    const onOverflow = vi.fn();
    const q = new PersistentQueue({ maxSize: 2, storageKey: STORAGE_KEY, onOverflow });
    q.enqueue(ev('a'));
    q.enqueue(ev('b'));
    q.enqueue(ev('c'));
    expect(q.size()).toBe(2);
    expect(onOverflow).toHaveBeenCalledWith(1);
    expect(q.drain(2)[0]?.event).toBe('b');
  });

  it('peek does not remove', () => {
    const q = new PersistentQueue({ maxSize: 10, storageKey: STORAGE_KEY });
    q.enqueue(ev('a'));
    q.peek(1);
    expect(q.size()).toBe(1);
  });

  it('isEmpty and clear', () => {
    const q = new PersistentQueue({ maxSize: 10, storageKey: STORAGE_KEY });
    expect(q.isEmpty()).toBe(true);
    q.enqueue(ev('a'));
    q.clear();
    expect(q.isEmpty()).toBe(true);
  });

  it('persists events to localStorage', () => {
    const q = new PersistentQueue({ maxSize: 10, storageKey: STORAGE_KEY });
    q.enqueue(ev('persisted'));
    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).toBeTruthy();
    expect(stored).toContain('persisted');
  });

  it('restores events from localStorage on construction', () => {
    const q1 = new PersistentQueue({ maxSize: 10, storageKey: STORAGE_KEY });
    q1.enqueue(ev('survived'));

    const q2 = new PersistentQueue({ maxSize: 10, storageKey: STORAGE_KEY });
    expect(q2.size()).toBe(1);
    expect(q2.peek(1)[0]?.event).toBe('survived');
  });

  it('drain persists the reduced queue', () => {
    const q1 = new PersistentQueue({ maxSize: 10, storageKey: STORAGE_KEY });
    q1.enqueue(ev('a'));
    q1.enqueue(ev('b'));
    q1.drain(1);

    const q2 = new PersistentQueue({ maxSize: 10, storageKey: STORAGE_KEY });
    expect(q2.size()).toBe(1);
    expect(q2.peek(1)[0]?.event).toBe('b');
  });

  it('clear removes from localStorage', () => {
    const q = new PersistentQueue({ maxSize: 10, storageKey: STORAGE_KEY });
    q.enqueue(ev('a'));
    q.clear();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('[]');
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');
    const q = new PersistentQueue({ maxSize: 10, storageKey: STORAGE_KEY });
    expect(q.size()).toBe(0);
  });
});
