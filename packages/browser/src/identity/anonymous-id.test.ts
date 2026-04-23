import { describe, it, expect, beforeEach } from 'vitest';
import { getOrCreateAnonymousId } from './anonymous-id.js';

describe('getOrCreateAnonymousId', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('generates and stores an ID', () => {
    const id = getOrCreateAnonymousId();
    expect(id).toBeTruthy();
    expect(localStorage.getItem('__appss_anonymous_id')).toBe(id);
  });

  it('returns the same ID on subsequent calls', () => {
    const id1 = getOrCreateAnonymousId();
    const id2 = getOrCreateAnonymousId();
    expect(id1).toBe(id2);
  });

  it('returns stored ID from localStorage', () => {
    localStorage.setItem('__appss_anonymous_id', 'existing-id');
    expect(getOrCreateAnonymousId()).toBe('existing-id');
  });
});
